# Manim Worker Service

This folder contains a standalone FastAPI service that renders Manim scenes in an isolated worker environment. It is intended to run alongside the main Next.js application and handle long-running video generation jobs without blocking API requests.

## Features

- HTTP API for submitting Python/Manim code and tracking render jobs
- Background execution of Manim using a dedicated container with all native dependencies pre-installed
- Optional pip-installation of additional Python packages per job
- Streaming access to render logs and final MP4 output
- Dockerfile that builds a ready-to-run worker image

## Quick Start (Local Docker)

```bash
# 1. Build the worker image
docker build -t manim-worker .

# 2. Run the worker API on port 8001
docker run --rm -p 8001:8000 \
  -e MANIM_OUTPUT_DIR=/data/outputs \
  -v "$(pwd)/outputs:/data/outputs" \
  manim-worker

# 3. Submit a render job
curl -X POST http://localhost:8001/jobs \
  -H "Content-Type: application/json" \
  -d '{
        "python_code": "from manim import *\nclass Hello(Scene):\n    def construct(self):\n        self.play(Write(Text(\"Hello\")))\n        self.wait(1)",
        "quality": "low"
      }'

# 4. Poll job status
curl http://localhost:8001/jobs/<job_id>

# 5. Download the video once status is `completed`
curl -LO http://localhost:8001/jobs/<job_id>/video
```

## Endpoints

| Method | Path                    | Description                              |
| ------ | ----------------------- | ---------------------------------------- |
| POST   | `/jobs`                 | Submit new render job                    |
| GET    | `/jobs`                 | List recent jobs                         |
| GET    | `/jobs/{job_id}`        | Fetch job status + logs                  |
| GET    | `/jobs/{job_id}/video` | Download generated MP4 (when available)  |

See `app/main.py` for the full OpenAPI schema.

## Project Layout

```
manim-worker/
├── Dockerfile          # Container definition with all dependencies
├── README.md           # This file
├── requirements.txt    # Python dependencies for the worker
├── app/
│   ├── __init__.py
│   └── main.py         # FastAPI application entrypoint
├── scripts/
│   └── start.sh        # Helper to launch uvicorn
└── outputs/            # (gitignored) Rendered videos when running locally
```

## Running Without Docker

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

# Ensure system deps are installed (see Dockerfile for apt list)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Connecting From Next.js

1. Deploy this worker (e.g. Fly.io, Render, AWS Fargate, etc.)
2. From your Next.js API route, `POST /jobs` with the Manim code
3. Store the returned `job_id` and poll `/jobs/{job_id}` until `status === 'completed'`
4. Once ready, stream `/jobs/{job_id}/video` to the browser or S3

## Security Notes

- The worker executes arbitrary Python; treat it as untrusted. Deploy in a hardened environment (containers with seccomp, gVisor, or firecracker).
- Apply authentication (API keys, mTLS, or private networking) before exposing publicly.
- Consider resource limits and quotas to prevent abuse. The Dockerfile sets defaults, but additional orchestration-level limits are recommended.


