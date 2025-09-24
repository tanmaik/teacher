import { Sandbox } from '@vercel/sandbox'

async function testSandboxEnvironment() {
  console.log('🔬 Starting Sandbox Environment Test...')

  let sandbox
  try {
    console.log('📦 Creating sandbox...')
    sandbox = await Sandbox.create({
      runtime: 'python3.13',
      resources: { vcpus: 2 },
      timeout: 5 * 60 * 1000, // 5 minutes
    })

    console.log('✅ Sandbox created successfully!')

    // Test 1: Check OS and available commands
    console.log('\n🔍 Test 1: Basic system info')
    const osInfo = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', 'cat /etc/os-release || uname -a']
    })
    console.log('OS Info:', await osInfo.stdout())

    // Test 2: Check available package managers
    console.log('\n🔍 Test 2: Available package managers')
    const packageManagers = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', 'which apt-get; which yum; which apk; which conda; which mamba; which pip; echo "---"; ls -la /usr/bin/ | grep -E "(apt|yum|conda|pip)"']
    })
    console.log('Package managers:', await packageManagers.stdout())

    // Test 3: Check Python environment
    console.log('\n🔍 Test 3: Python environment')
    const pythonInfo = await sandbox.runCommand({
      cmd: 'python',
      args: ['-c', 'import sys; print(f"Python {sys.version}"); print(f"Executable: {sys.executable}"); import site; print(f"Site packages: {site.getsitepackages()}")']
    })
    console.log('Python info:', await pythonInfo.stdout())

    // Test 4: Check what's pre-installed
    console.log('\n🔍 Test 4: Pre-installed packages')
    const preInstalled = await sandbox.runCommand({
      cmd: 'pip',
      args: ['list']
    })
    console.log('Pip packages:', (await preInstalled.stdout()).substring(0, 1000) + '...')

    // Test 5: Try simple package install
    console.log('\n🔍 Test 5: Test simple package install')
    const testInstall = await sandbox.runCommand({
      cmd: 'pip',
      args: ['install', 'requests']
    })
    console.log('Test install result:', await testInstall.stdout())
    console.log('Test install errors:', await testInstall.stderr())
    console.log('Test install exit code:', testInstall.exitCode)

    // Test 6: Check system libraries
    console.log('\n🔍 Test 6: System libraries')
    const sysLibs = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', 'ls -la /usr/lib/x86_64-linux-gnu/ | head -20; echo "---"; ldconfig -p | grep -E "(cairo|pango|gdk)" | head -10']
    })
    console.log('System libs:', await sysLibs.stdout())

    // Test 7: Try installing pycairo directly
    console.log('\n🔍 Test 7: Try installing pycairo directly')
    const pycairoTest = await sandbox.runCommand({
      cmd: 'pip',
      args: ['install', '--no-cache-dir', 'pycairo']
    })
    console.log('Pycairo stdout:', (await pycairoTest.stdout()).substring(0, 800))
    console.log('Pycairo stderr:', (await pycairoTest.stderr()).substring(0, 800))
    console.log('Pycairo exit code:', pycairoTest.exitCode)

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    if (sandbox) {
      console.log('\n🧹 Cleaning up sandbox...')
      await sandbox.stop()
      console.log('✅ Sandbox stopped')
    }
  }
}

testSandboxEnvironment()