import { UIDataTypes } from 'ai'

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000
const DEFAULT_POLL_INTERVAL_MS = 2000
const workerUrl = process.env.MANIM_WORKER_URL ?? 'http://127.0.0.1:8001'

interface ManimExecutionOptions {
  timeout?: number
  quality?: 'low' | 'medium' | 'high'
  additionalPackages?: string[]
}

interface ManimExecutionResult {
  success: boolean
  videoUrl?: string
  output: string
  error?: string
}

type WorkerJobStatus = 'pending' | 'running' | 'completed' | 'failed'

interface WorkerJob {
  id: string
  status: WorkerJobStatus
  quality: 'low' | 'medium' | 'high'
  additional_packages: string[]
  stdout_log: string
  stderr_log: string
  output_path: string | null
  error_message: string | null
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildVideoUrl(jobId: string) {
  const url = new URL(`/jobs/${jobId}/video`, workerUrl)
  return url.toString()
}

function buildJobUrl(jobId: string) {
  const url = new URL(`/jobs/${jobId}`, workerUrl)
  return url.toString()
}

export async function executeManimCode(
  pythonCode: string,
  options: ManimExecutionOptions = {}
): Promise<ManimExecutionResult> {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    quality = 'medium',
    additionalPackages = [],
  } = options

  const pollInterval = Number(process.env.MANIM_WORKER_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS)

  console.log(`Creating Manim job at ${workerUrl}/jobs`)

  const createResponse = await fetch(new URL('/jobs', workerUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      python_code: pythonCode,
      quality,
      additional_packages: additionalPackages,
    }),
  })

  if (!createResponse.ok) {
    const body = await createResponse.text()
    console.error(`Failed to create Manim job: Status ${createResponse.status}, Body: ${body}`)
    return {
      success: false,
      output: body,
      error: `Failed to create Manim job (${createResponse.status})`,
    }
  }

  const job: WorkerJob = await createResponse.json()
  console.log(`Created Manim job ${job.id} with status: ${job.status}`)
  const startTime = Date.now()

  while (true) {
    if (Date.now() - startTime > timeout) {
      console.error(`Manim job ${job.id} timed out after ${timeout}ms`)
      return {
        success: false,
        output: 'Timed out while waiting for Manim worker',
        error: 'Timed out waiting for Manim worker',
      }
    }

    const statusResponse = await fetch(buildJobUrl(job.id), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!statusResponse.ok) {
      const body = await statusResponse.text()
      console.error(`Failed to fetch job status for ${job.id}: Status ${statusResponse.status}, Body: ${body}`)
      return {
        success: false,
        output: body,
        error: `Failed to fetch job status (${statusResponse.status})`,
      }
    }

    const current: WorkerJob = await statusResponse.json()
    console.log(`Job ${job.id} status: ${current.status}`)

    if (current.status === 'completed' && current.output_path) {
      const output = [current.stdout_log, current.stderr_log].filter(Boolean).join('\n')
      console.log(`Manim job ${job.id} completed successfully, video URL: ${buildVideoUrl(current.id)}`)
      return {
        success: true,
        videoUrl: buildVideoUrl(current.id),
        output,
      }
    }

    if (current.status === 'failed') {
      const output = [current.stdout_log, current.stderr_log].filter(Boolean).join('\n')
      console.error(`Manim job ${job.id} failed:`, {
        error: current.error_message,
        stdout: current.stdout_log,
        stderr: current.stderr_log
      })
      return {
        success: false,
        output,
        error: current.error_message ?? 'Manim worker reported failure',
      }
    }

    await sleep(pollInterval)
  }
}

export function createManimTemplate(sceneClassName: string = 'MyScene'): string {
  return `from manim import *

class ${sceneClassName}(Scene):
    def construct(self):
        text = Text("Key Concept", font_size=48)
        self.play(Write(text), run_time=2)
        self.wait(1)

        formula = MathTex("E = mc^2")
        self.play(Transform(text, formula), run_time=2)
        self.wait(2)
`
}

export function validateManimCode(pythonCode: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!pythonCode.includes('from manim import') && !pythonCode.includes('import manim')) {
    issues.push('Missing Manim import statement')
  }

  if (!pythonCode.includes('(Scene)')) {
    issues.push('No Scene class found - Manim requires a class that inherits from Scene')
  }

  if (!pythonCode.includes('def construct(')) {
    issues.push('No construct method found - Scene class must have a construct method')
  }

  const dangerousPatterns = ['import os', 'import subprocess', 'import sys', '__import__', 'exec(', 'eval(', 'open(', 'file(']
  for (const pattern of dangerousPatterns) {
    if (pythonCode.includes(pattern)) {
      issues.push(`Potentially unsafe operation detected: ${pattern}`)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}