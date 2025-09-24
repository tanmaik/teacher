import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_fixed


OUTPUT_DIR = Path(os.environ.get("MANIM_OUTPUT_DIR", Path.cwd() / "outputs")).resolve()
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Manim Worker", version="0.1.0")


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class CreateJobRequest(BaseModel):
    python_code: str = Field(..., min_length=1, max_length=50_000)
    quality: str = Field("medium", pattern="^(low|medium|high)$")
    additional_packages: Optional[List[str]] = Field(default=None, max_length=10)


class Job(BaseModel):
    id: str
    status: JobStatus
    quality: str
    additional_packages: List[str]
    stdout_log: str = ""
    stderr_log: str = ""
    output_path: Optional[str] = None
    error_message: Optional[str] = None


jobs_lock = asyncio.Lock()
jobs: Dict[str, Job] = {}


def quality_flag(quality: str) -> str:
    flags = {
        "low": "-ql",
        "medium": "-qm",
        "high": "-qh",
    }
    return flags[quality]


@retry(stop=stop_after_attempt(3), wait=wait_fixed(1))
def pip_install(packages: List[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["python", "-m", "pip", "install", "--no-cache-dir", *packages],
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )


def run_manim(job: Job, request: CreateJobRequest, working_dir: Path) -> Job:
    quality = request.quality
    render_flag = quality_flag(quality)

    script_path = working_dir / "scene.py"
    script_path.write_text(request.python_code, encoding="utf-8")

    if request.additional_packages:
        try:
            install_result = pip_install(request.additional_packages, working_dir)
            job.stdout_log += install_result.stdout
            job.stderr_log += install_result.stderr
        except subprocess.CalledProcessError as exc:
            job.status = JobStatus.FAILED
            job.stderr_log += exc.stderr
            job.error_message = "Failed to install additional packages"
            return job

    env = os.environ.copy()
    env.setdefault("FFMPEG_BINARY", shutil.which("ffmpeg") or "ffmpeg")
    env.setdefault("PYTHONPATH", str(working_dir))

    render_process = subprocess.run(
        [
            sys.executable,
            "-m",
            "manim",
            str(script_path),
            render_flag,
            "--format",
            "mp4",
            "--renderer",
            "cairo",
        ],
        cwd=working_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
    )

    job.stdout_log += render_process.stdout
    job.stderr_log += render_process.stderr

    if render_process.returncode != 0:
        job.status = JobStatus.FAILED
        job.error_message = "Manim rendering failed"
        return job

    media_dir = working_dir / "media"
    mp4_files = list(media_dir.glob("**/*.mp4"))

    if not mp4_files:
        job.status = JobStatus.FAILED
        job.error_message = "No MP4 generated"
        return job

    output_dest = OUTPUT_DIR / f"{job.id}.mp4"
    output_dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(mp4_files[0], output_dest)
    job.output_path = str(output_dest)
    job.status = JobStatus.COMPLETED
    return job


async def execute_job(job_id: str, request: CreateJobRequest) -> None:
    tmp_dir = Path(tempfile.mkdtemp(prefix="manim-job-"))
    async with jobs_lock:
        job = jobs[job_id]
        job.status = JobStatus.RUNNING
    try:
        updated_job = run_manim(job, request, tmp_dir)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        updated_job = job
        updated_job.status = JobStatus.FAILED
        updated_job.error_message = str(exc)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    async with jobs_lock:
        jobs[job_id] = updated_job


@app.post("/jobs", response_model=Job, status_code=201)
async def create_job(payload: CreateJobRequest):
    job_id = uuid.uuid4().hex
    job = Job(
        id=job_id,
        status=JobStatus.PENDING,
        quality=payload.quality,
        additional_packages=payload.additional_packages or [],
    )
    async with jobs_lock:
        jobs[job_id] = job

    asyncio.create_task(execute_job(job_id, payload))
    return job


@app.get("/jobs", response_model=List[Job])
async def list_jobs():
    async with jobs_lock:
        return list(jobs.values())


@app.get("/jobs/{job_id}", response_model=Job)
async def get_job(job_id: str):
    async with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/jobs/{job_id}/video")
async def download_video(job_id: str):
    async with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.COMPLETED or not job.output_path:
        raise HTTPException(status_code=409, detail="Job not completed")
    video_path = Path(job.output_path)
    if not video_path.exists():
        raise HTTPException(status_code=410, detail="Video expired")
    return FileResponse(video_path, media_type="video/mp4", filename=video_path.name)

