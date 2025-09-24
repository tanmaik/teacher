import { Sandbox } from '@vercel/sandbox'
import ms from 'ms'

interface ManimExecutionResult {
  success: boolean
  videoUrl?: string
  output: string
  error?: string
  sceneName?: string
}

interface ManimExecutionOptions {
  timeout?: number // in milliseconds, defaults to 5 minutes
  quality?: 'low' | 'medium' | 'high'
  additionalPackages?: string[]
}

function extractSceneNames(pythonCode: string): string[] {
  const sceneRegex = /class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*Scene\s*\)\s*:/g
  const sceneNames: string[] = []

  let match: RegExpExecArray | null
  while ((match = sceneRegex.exec(pythonCode)) !== null) {
    sceneNames.push(match[1])
  }

  return sceneNames
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

  console.log('🚀 Starting Manim execution with options:', {
    timeout: ms(timeout),
    quality,
    additionalPackages,
    codeLength: pythonCode.length
  })

  let sandbox: Sandbox | null = null
  let output = ''
  let error = ''

  try {
    // Create sandbox with Python runtime
    console.log('📦 Creating Vercel Sandbox with Python 3.13 runtime...')
    const sandboxStartTime = Date.now()

    sandbox = await Sandbox.create({
      runtime: 'python3.13',
      resources: { vcpus: 4 }, // Use more CPU for video rendering
      timeout,
      ports: [8000], // For serving video files
    })

    console.log(`✅ Sandbox created successfully in ${Date.now() - sandboxStartTime}ms`)
    console.log('📋 Sandbox info:', {
      id: sandbox.id,
      ports: [8000]
    })

    // Note: Domain is only available after ports are exposed
    console.log('🚀 Sandbox ready for exploration and package installation')

    // Comprehensive environment exploration
    console.log('\n🔬=== SANDBOX ENVIRONMENT EXPLORATION ===')

    // Check 1: OS info
    console.log('🔍 OS Information:')
    const osInfo = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', 'cat /etc/os-release || uname -a'],
    })
    console.log('OS:', await osInfo.stdout())

    // Check 2: Available commands/package managers
    console.log('🔍 Available package managers and commands:')
    const checkCommands = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', 'echo "=== Which commands exist ==="; which apt-get yum apk conda mamba pip python pip3 | head -20; echo "=== /usr/bin listing ==="; ls -la /usr/bin/ | grep -E "(apt|yum|conda|pip|python)" | head -10'],
    })
    console.log('Commands:', await checkCommands.stdout())

    // Check 3: Python environment details
    console.log('🔍 Python environment:')
    const pythonEnv = await sandbox.runCommand({
      cmd: 'python',
      args: ['-c', 'import sys, site; print(f"Python {sys.version}"); print(f"Executable: {sys.executable}"); print(f"Site packages: {site.getsitepackages()}")'],
    })
    console.log('Python info:', await pythonEnv.stdout())

    // Check 4: Pre-installed packages
    console.log('🔍 Pre-installed Python packages:')
    const preInstalled = await sandbox.runCommand({
      cmd: 'pip',
      args: ['list'],
    })
    const pipList = await preInstalled.stdout()
    console.log('Pre-installed packages:', pipList.slice(0, 800) + (pipList.length > 800 ? '...' : ''))

    // Check 5: System libraries for graphics
    console.log('🔍 System libraries (cairo, pango, etc.):')
    const sysLibs = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', 'echo "=== Library dirs ==="; ls -la /usr/lib/x86_64-linux-gnu/ 2>/dev/null | grep -E "(cairo|pango|gdk)" | head -5; echo "=== ldconfig ==="; ldconfig -p 2>/dev/null | grep -E "(cairo|pango|gdk)" | head -5; echo "=== pkg-config ==="; pkg-config --list-all 2>/dev/null | grep -E "(cairo|pango)" | head -5'],
    })
    console.log('System libs:', await sysLibs.stdout())

    console.log('🔬=== END EXPLORATION ===\n')

    // Try to install system dependencies using yum with sudo (Amazon Linux)
    console.log('🔧 Installing system dependencies via yum with sudo (Amazon Linux)...')
    const installSystemDeps = await sandbox.runCommand({
      cmd: 'yum',
      args: ['install', '-y', 'cairo-devel', 'pango-devel', 'gdk-pixbuf2-devel', 'libffi-devel', 'pkg-config', 'gcc', 'gcc-c++', 'make'],
      sudo: true,  // Use sudo for system package installation
    })

    console.log('🔧 System dependencies output:', await installSystemDeps.stdout())
    console.log('🔧 System dependencies stderr:', await installSystemDeps.stderr())

    if (installSystemDeps.exitCode === 0) {
      console.log('✅ System dependencies installed successfully!')

      // Now check if the libraries are properly installed
      console.log('🔍 Verifying installed libraries...')
      const verifyLibs = await sandbox.runCommand({
        cmd: 'bash',
        args: ['-c', 'pkg-config --list-all | grep -E "(cairo|pango)" && echo "Libraries verified!"'],
      })
      console.log('Library verification:', await verifyLibs.stdout())

      // Try to install ffmpeg using alternative methods
      console.log('🎬 Attempting to install ffmpeg...')
      // First try: Check if ffmpeg is available in standard repo
      const ffmpegInstall = await sandbox.runCommand({
        cmd: 'bash',
        args: ['-c', 'yum install -y ffmpeg || echo "ffmpeg not in standard repos, trying alternatives..."'],
        sudo: true,
      })
      console.log('ffmpeg install attempt:', await ffmpegInstall.stdout())

      // If ffmpeg not found, we'll use imageio-ffmpeg Python package as fallback
      if (ffmpegInstall.exitCode !== 0) {
        console.log('📦 Installing imageio-ffmpeg as fallback for video rendering...')
        const imageioInstall = await sandbox.runCommand({
          cmd: 'pip',
          args: ['install', 'imageio-ffmpeg'],
        })
        console.log('imageio-ffmpeg install:', await imageioInstall.stdout())
      }
    } else {
      console.log('⚠️ System dependencies failed, error code:', installSystemDeps.exitCode)
      console.log('❌ Unable to install system dependencies, Manim will likely fail')
    }

    // Install Manim and dependencies - include imageio-ffmpeg for video rendering
    const packagesToInstall = ['manim', 'numpy', 'scipy', 'imageio-ffmpeg', 'imageio', ...additionalPackages]
    console.log('📦 Installing Python packages (with imageio-ffmpeg for video rendering):', packagesToInstall)
    const installStartTime = Date.now()

    const installManim = await sandbox.runCommand({
      cmd: 'pip',
      args: ['install', ...packagesToInstall],
    })

    const installStdout = await installManim.stdout()
    const installStderr = await installManim.stderr()
    output += installStdout
    output += installStderr

    console.log(`📦 Package installation completed in ${Date.now() - installStartTime}ms`)
    console.log('📦 Installation stdout preview:', installStdout.slice(0, 500) + (installStdout.length > 500 ? '...' : ''))

    if (installStderr) {
      console.log('⚠️ Installation stderr:', installStderr.slice(0, 500) + (installStderr.length > 500 ? '...' : ''))
    }

    if (installManim.exitCode !== 0) {
      console.error('❌ Package installation failed with exit code:', installManim.exitCode)
      throw new Error('Failed to install Manim dependencies')
    }

    console.log('✅ All packages installed successfully')

    // Get ffmpeg binary path from imageio-ffmpeg (it comes bundled)
    console.log('🎬 Setting up ffmpeg from imageio-ffmpeg...')
    const setupFfmpeg = await sandbox.runCommand({
      cmd: 'python',
      args: ['-c', `
import imageio_ffmpeg
import os

# Get the bundled ffmpeg path from imageio-ffmpeg
ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
print(f"ffmpeg binary located at: {ffmpeg_path}")

# Verify ffmpeg exists
if os.path.exists(ffmpeg_path):
    print("✅ ffmpeg binary exists and is accessible")
    # Get version info
    import subprocess
    result = subprocess.run([ffmpeg_path, '-version'], capture_output=True, text=True)
    if result.returncode == 0:
        print("ffmpeg version info:", result.stdout.split('\\n')[0])
else:
    print("❌ ffmpeg binary not found at expected path")

# Set environment variable for Manim
os.environ['FFMPEG_BINARY'] = ffmpeg_path
print(f"FFMPEG_BINARY environment variable set to: {ffmpeg_path}")
`],
    })
    console.log('ffmpeg setup output:', await setupFfmpeg.stdout())
    if (setupFfmpeg.stderr) {
      console.log('ffmpeg setup stderr:', await setupFfmpeg.stderr())
    }

    // Get ffmpeg path and export it
    const ffmpegPath = await sandbox.runCommand({
      cmd: 'python',
      args: ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
    })
    const ffmpegBinary = (await ffmpegPath.stdout()).trim()
    console.log('🎬 ffmpeg binary path:', ffmpegBinary)

    // Export FFMPEG_BINARY environment variable
    await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', `export FFMPEG_BINARY="${ffmpegBinary}" && echo "FFMPEG_BINARY exported: $FFMPEG_BINARY"`],
    })

    // Create the Python script file using echo
    console.log('📝 Writing Python code to manim_scene.py...')
    console.log('📝 Python code preview:', pythonCode.slice(0, 200) + (pythonCode.length > 200 ? '...' : ''))

    const writeFileResult = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', `cat > manim_scene.py << 'EOF'\n${pythonCode}\nEOF`],
    })

    if (writeFileResult.exitCode !== 0) {
      console.error('❌ Failed to write Python file')
      throw new Error('Failed to write Python script')
    }

    console.log('✅ Python script written successfully')

    // Verify file was created and show its content
    const verifyFile = await sandbox.runCommand({
      cmd: 'ls',
      args: ['-la', 'manim_scene.py'],
    })
    console.log('📁 File verification:', await verifyFile.stdout())

    const sceneNames = extractSceneNames(pythonCode)
    if (sceneNames.length === 0) {
      console.error('❌ No Scene classes detected in Python code')
      throw new Error('No Scene class found to render. Ensure your code defines `class MyScene(Scene):`')
    }

    const bz2Support = await sandbox.runCommand({
      cmd: 'python',
      args: ['-c', 'import bz2'],
    })

    if (bz2Support.exitCode !== 0) {
      console.log('⚠️ _bz2 module unavailable; creating compatibility shim')
      const createBz2Shim = await sandbox.runCommand({
        cmd: 'bash',
        args: ['-c', `cat > /vercel/sandbox/bz2.py <<'EOF'
class _BZ2Unsupported:
    def __init__(self, *args, **kwargs):
        raise RuntimeError("bz2 compression is not available in this sandbox environment")


class BZ2File(_BZ2Unsupported):
    pass


def open(*args, **kwargs):
    raise RuntimeError("bz2 compression is not available in this sandbox environment")


def decompress(*args, **kwargs):
    raise RuntimeError("bz2 compression is not available in this sandbox environment")


def compress(*args, **kwargs):
    raise RuntimeError("bz2 compression is not available in this sandbox environment")


__all__ = ['BZ2File', 'open', 'compress', 'decompress']
EOF`],
      })

      if (createBz2Shim.exitCode !== 0) {
        console.error('❌ Failed to create bz2 shim module')
        throw new Error('Unable to provide bz2 compatibility shim')
      }

      const verifyShim = await sandbox.runCommand({
        cmd: 'python',
        args: ['-c', 'import bz2; print("✅ bz2 shim active")'],
        cwd: '/vercel/sandbox',
      })
      console.log('bz2 shim verification:', await verifyShim.stdout())
    } else {
      console.log('✅ _bz2 module available natively')
    }

    const sceneToRender = sceneNames[0]
    console.log('🎯 Scene classes detected:', sceneNames)
    console.log('🎯 Using scene for render:', sceneToRender)

    // Set quality flags
    const qualityFlags = {
      low: ['-ql'], // Low quality, fast render
      medium: ['-qm'], // Medium quality
      high: ['-qh'], // High quality, slow render
    }

    // Execute Manim to render the scene - wrap in bash to set FFMPEG_BINARY
    const renderArgs = [
      'manim_scene.py',
      sceneToRender,
      ...qualityFlags[quality],
      '--renderer', 'cairo',
      '--format', 'mp4', // Ensure MP4 output for browser compatibility
    ]

    console.log('🎬 Starting Manim rendering with quality:', quality)
    console.log('🎬 Render command: manim', renderArgs.join(' '))
    console.log('🎬 Setting FFMPEG_BINARY environment variable for Manim...')
    const renderStartTime = Date.now()

    // Run Manim with the ffmpeg path set
    const renderResult = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', `
# Get ffmpeg path from imageio
FFMPEG_BINARY=$(python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
export FFMPEG_BINARY
export PYTHONPATH="/vercel/sandbox:$PYTHONPATH"
echo "Using ffmpeg at: $FFMPEG_BINARY"
echo "Using PYTHONPATH: $PYTHONPATH"

# Run Manim
manim ${renderArgs.join(' ')}
`],
    })

    const renderStdout = await renderResult.stdout()
    const renderStderr = await renderResult.stderr()
    output += renderStdout
    output += renderStderr

    console.log(`🎬 Manim rendering completed in ${Date.now() - renderStartTime}ms`)
    console.log('🎬 Render stdout preview:', renderStdout.slice(0, 500) + (renderStdout.length > 500 ? '...' : ''))

    if (renderStderr) {
      console.log('⚠️ Render stderr (preview):', renderStderr.slice(0, 500) + (renderStderr.length > 500 ? '...' : ''))
    }

    if (renderResult.exitCode !== 0) {
      if (renderStderr) {
        const tail = renderStderr.length > 2000 ? renderStderr.slice(-2000) : renderStderr
        console.log('⚠️ Render stderr (tail):', tail)
      }
      console.error('❌ Manim rendering failed with exit code:', renderResult.exitCode)
      throw new Error('Manim rendering failed')
    }

    console.log('✅ Manim rendering successful')

    // Find the generated video file
    console.log('🔍 Searching for generated video files...')
    const findVideo = await sandbox.runCommand({
      cmd: 'find',
      args: ['/vercel/sandbox', '-name', '*.mp4', '-type', 'f'],
    })

    const findOutput = await findVideo.stdout()
    console.log('🔍 Find command output:', findOutput)

    const videoFiles = findOutput.trim().split('\n').filter(path => path.trim())
    console.log('🔍 Found video files:', videoFiles)

    const videoPath = videoFiles[0]
    if (!videoPath) {
      console.error('❌ No video files found in sandbox')
      // Let's also check what files exist in the media directory
      const listMedia = await sandbox.runCommand({
        cmd: 'find',
        args: ['/vercel/sandbox', '-type', 'f', '-name', '*'],
      })
      console.log('🔍 All files in sandbox:', await listMedia.stdout())
      throw new Error('No video file generated')
    }

    // Get file size and info
    const fileInfo = await sandbox.runCommand({
      cmd: 'ls',
      args: ['-lh', videoPath],
    })
    console.log('📁 Video file info:', await fileInfo.stdout())
    console.log(`✅ Video generated successfully at: ${videoPath}`)

    // Start a simple HTTP server to serve the video
    console.log('🌐 Starting HTTP server on port 8000...')
    const serverResult = await sandbox.runCommand({
      cmd: 'python',
      args: ['-m', 'http.server', '8000'],
      detached: true,
      cwd: '/vercel/sandbox',
    })

    console.log('🌐 HTTP server started, waiting for initialization...')
    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Test if server is running
    const testServer = await sandbox.runCommand({
      cmd: 'curl',
      args: ['-I', 'http://localhost:8000'],
    })
    console.log('🌐 Server test result:', await testServer.stdout())

    // Get the relative path for the video
    const relativePath = videoPath.replace('/vercel/sandbox/', '')
    const videoUrl = `${sandbox.domain(8000)}/${relativePath}`

    console.log('🔗 Video URL generated:', {
      fullPath: videoPath,
      relativePath,
      publicUrl: videoUrl,
      sandboxDomain: sandbox.domain(8000)
    })

    console.log('🎉 Manim execution completed successfully!')
    console.log('📊 Final execution summary:', {
      success: true,
      videoUrl,
      outputLength: output.length,
      quality,
      scene: sceneToRender,
      sandboxId: sandbox.id
    })

    return {
      success: true,
      videoUrl,
      output,
      sceneName: sceneToRender,
    }

  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    console.error('❌ Manim execution failed:', {
      error,
      sandboxId: sandbox?.id,
      outputLength: output.length
    })
    console.error('❌ Full error details:', err)

    return {
      success: false,
      output,
      error,
    }
  } finally {
    // Note: We don't stop the sandbox immediately to allow video access
    // The sandbox will auto-stop after the timeout period
    if (sandbox && error) {
      console.log('🧹 Cleaning up sandbox due to error...')
      await sandbox.stop().catch((stopErr) => {
        console.error('⚠️ Error stopping sandbox:', stopErr)
      })
    } else if (sandbox) {
      console.log('🔄 Sandbox kept alive for video serving (will auto-stop after timeout)')
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
  console.log('🔍 Validating Manim Python code...')
  console.log('📝 Code length:', pythonCode.length, 'characters')

  const issues: string[] = []

  // Check for basic Manim imports
  console.log('🔍 Checking for Manim imports...')
  if (!pythonCode.includes('from manim import') && !pythonCode.includes('import manim')) {
    issues.push('Missing Manim import statement')
    console.log('❌ No Manim import found')
  } else {
    console.log('✅ Manim import found')
  }

  // Check for Scene class
  console.log('🔍 Checking for Scene class inheritance...')
  if (!pythonCode.includes('(Scene)')) {
    issues.push('No Scene class found - Manim requires a class that inherits from Scene')
    console.log('❌ No Scene class inheritance found')
  } else {
    console.log('✅ Scene class inheritance found')
  }

  // Check for construct method
  console.log('🔍 Checking for construct method...')
  if (!pythonCode.includes('def construct(')) {
    issues.push('No construct method found - Scene class must have a construct method')
    console.log('❌ No construct method found')
  } else {
    console.log('✅ Construct method found')
  }

  // Basic security check - prevent dangerous operations
  console.log('🔒 Running security validation...')
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

  const foundDangerousPatterns: string[] = []
  for (const pattern of dangerousPatterns) {
    if (pythonCode.includes(pattern)) {
      issues.push(`Potentially unsafe operation detected: ${pattern}`)
      foundDangerousPatterns.push(pattern)
    }
  }

  if (foundDangerousPatterns.length > 0) {
    console.log('⚠️ Security issues found:', foundDangerousPatterns)
  } else {
    console.log('✅ No security issues detected')
  }

  const isValid = issues.length === 0
  console.log(`🎯 Validation ${isValid ? 'PASSED' : 'FAILED'}:`, {
    valid: isValid,
    issueCount: issues.length,
    issues: issues
  })

  return {
    valid: isValid,
    issues
  }
}