/**
 * electron-builder afterPack hook
 * Removes unnecessary platform binaries from @anthropic-ai/claude-agent-sdk/vendor/
 * Only keeps binaries matching the current build target platform/arch.
 */
const path = require('path')
const fs = require('fs')

// Map electron-builder platform to vendor directory suffix
const PLATFORM_MAP = {
  darwin: 'darwin',
  mac: 'darwin',
  win32: 'win32',
  win: 'win32',
  linux: 'linux'
}

// Vendor subdirectories that contain platform-specific binaries
const VENDOR_DIRS = ['ripgrep', 'audio-capture']

module.exports = async function afterPack(context) {
  const electronPlatformName = context.electronPlatformName
  const targetPlatform = PLATFORM_MAP[electronPlatformName]

  if (!targetPlatform) {
    console.log('[strip-vendor] Unknown platform, skipping vendor cleanup')
    return
  }

  // Determine arch from appOutDir path:
  // release/mac-arm64 -> arm64, release/mac -> x64
  const appOutDir = context.appOutDir
  let targetArch = 'x64'
  if (appOutDir.includes('arm64')) {
    targetArch = 'arm64'
  }

  const keepPattern = `${targetArch}-${targetPlatform}`
  console.log(`[strip-vendor] Target: ${keepPattern}, platform: ${electronPlatformName}, appOutDir: ${appOutDir}`)

  const possiblePaths = [
    path.join(
      appOutDir,
      context.packager.appInfo.productFilename + '.app',
      'Contents', 'Resources', 'app.asar.unpacked',
      'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'vendor'
    ),
    path.join(
      appOutDir, 'resources', 'app.asar.unpacked',
      'node_modules', '@anthropic-ai', 'claude-agent-sdk', 'vendor'
    )
  ]

  for (const vendorDir of possiblePaths) {
    if (!fs.existsSync(vendorDir)) continue
    console.log(`[strip-vendor] Found vendor dir: ${vendorDir}`)

    for (const subdir of VENDOR_DIRS) {
      const subdirPath = path.join(vendorDir, subdir)
      if (!fs.existsSync(subdirPath)) continue

      const entries = fs.readdirSync(subdirPath)
      for (const entry of entries) {
        const entryPath = path.join(subdirPath, entry)
        const stat = fs.statSync(entryPath)
        if (!stat.isDirectory()) continue

        if (entry === keepPattern) {
          console.log(`[strip-vendor] Keeping ${subdir}/${entry}`)
        } else {
          console.log(`[strip-vendor] Removing ${subdir}/${entry}`)
          fs.rmSync(entryPath, { recursive: true, force: true })
        }
      }
    }
  }
}
