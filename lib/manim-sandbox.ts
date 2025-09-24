import { Sandbox } from '@vercel/sandbox'
import ms from 'ms'

interface ManimExecutionResult {
  success: boolean
  videoUrl?: string
  output: string
  error?: string
}

interface ManimExecutionOptions {
  timeout?: number // in milliseconds, defaults to 5 minutes
  quality?: 'low' | 'medium' | 'high'
  additionalPackages?: string[]
}

/**
 * Execute Python code with Manim and return a viewable video
 * @param pythonCode - Python code string that uses Manim
 * @param options - Configuration options for execution
 * @returns Promise with execution result including video URL if successful
 */
export async function executeManimCode(
  pythonCode: string,
  options: ManimExecutionOptions = {}
): Promise<ManimExecutionResult> {
  const {
    timeout = ms('5m'),
    quality = 'medium',
    additionalPackages = []
  } = options

  let sandbox: Sandbox | null = null
  let output = ''
  let error = ''

  try {
    // Create sandbox with Python runtime
    sandbox = await Sandbox.create({
      runtime: 'python3.13',
      resources: { vcpus: 4 }, // Use more CPU for video rendering
      timeout,
      ports: [8000], // For serving video files
    })

    // Install Manim and dependencies
    console.log('Installing Manim and dependencies...')
    const installManim = await sandbox.runCommand({
      cmd: 'pip',
      args: ['install', 'manim[jupyterlab]', 'numpy', 'scipy', ...additionalPackages],
    })

    output += await installManim.stdout()
    output += await installManim.stderr()

    if (installManim.exitCode !== 0) {
      throw new Error('Failed to install Manim dependencies')
    }

    // Create the Python script file using echo
    await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', `cat > manim_scene.py << 'EOF'\n${pythonCode}\nEOF`],
    })

    // Set quality flags
    const qualityFlags = {
      low: ['-ql'], // Low quality, fast render
      medium: ['-qm'], // Medium quality
      high: ['-qh'], // High quality, slow render
    }

    // Execute Manim to render the scene
    console.log('Rendering Manim scene...')
    const renderResult = await sandbox.runCommand({
      cmd: 'manim',
      args: [
        'manim_scene.py',
        ...qualityFlags[quality],
        '--disable_caching', // Disable caching for consistent results
        '--format', 'mp4', // Ensure MP4 output for browser compatibility
      ],
    })

    output += await renderResult.stdout()
    output += await renderResult.stderr()

    if (renderResult.exitCode !== 0) {
      throw new Error('Manim rendering failed')
    }

    // Find the generated video file
    const findVideo = await sandbox.runCommand({
      cmd: 'find',
      args: ['/vercel/sandbox', '-name', '*.mp4', '-type', 'f'],
    })

    const videoPath = (await findVideo.stdout()).trim().split('\n')[0]
    if (!videoPath) {
      throw new Error('No video file generated')
    }

    console.log(`Video generated at: ${videoPath}`)

    // Start a simple HTTP server to serve the video
    await sandbox.runCommand({
      cmd: 'python',
      args: ['-m', 'http.server', '8000'],
      detached: true,
      cwd: '/vercel/sandbox',
    })

    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Get the relative path for the video
    const relativePath = videoPath.replace('/vercel/sandbox/', '')
    const videoUrl = `${sandbox.domain(8000)}/${relativePath}`

    return {
      success: true,
      videoUrl,
      output,
    }

  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    console.error('Manim execution error:', error)

    return {
      success: false,
      output,
      error,
    }
  } finally {
    // Note: We don't stop the sandbox immediately to allow video access
    // The sandbox will auto-stop after the timeout period
    if (sandbox && error) {
      await sandbox.stop().catch(console.error)
    }
  }
}

/**
 * Create a basic Manim scene template
 */
export function createManimTemplate(sceneClassName: string = 'MyScene'): string {
  return `from manim import *

class ${sceneClassName}(Scene):
    def construct(self):
        # Keep animations SHORT (10-30 seconds max)
        # Focus on ONE concept per scene

        # Example: Simple concept demonstration
        text = Text("Key Concept", font_size=48)
        self.play(Write(text), run_time=2)
        self.wait(1)

        # Show the main idea quickly
        formula = MathTex("E = mc^2")
        self.play(Transform(text, formula), run_time=2)
        self.wait(2)

        # End scene - keep total under 30 seconds
`
}

/**
 * Validate Python code for basic Manim structure
 */
export function validateManimCode(pythonCode: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  // Check for basic Manim imports
  if (!pythonCode.includes('from manim import') && !pythonCode.includes('import manim')) {
    issues.push('Missing Manim import statement')
  }

  // Check for Scene class
  if (!pythonCode.includes('(Scene)')) {
    issues.push('No Scene class found - Manim requires a class that inherits from Scene')
  }

  // Check for construct method
  if (!pythonCode.includes('def construct(')) {
    issues.push('No construct method found - Scene class must have a construct method')
  }

  // Basic security check - prevent dangerous operations
  const dangerousPatterns = [
    'import os',
    'import subprocess',
    'import sys',
    '__import__',
    'exec(',
    'eval(',
    'open(',
    'file(',
  ]

  for (const pattern of dangerousPatterns) {
    if (pythonCode.includes(pattern)) {
      issues.push(`Potentially unsafe operation detected: ${pattern}`)
    }
  }

  return {
    valid: issues.length === 0,
    issues
  }
}