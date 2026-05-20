/**
 * Loads optional .env mirror overrides, then runs electron-builder install-app-deps.
 * Replaces deprecated .npmrc keys (electron_mirror, electron_builder_binaries_mirror).
 */
const { execSync } = require('child_process')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

if (!process.env.ELECTRON_MIRROR) {
  process.env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
}
if (!process.env.ELECTRON_BUILDER_BINARIES_MIRROR) {
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
    'https://npmmirror.com/mirrors/electron-builder-binaries/'
}

execSync('electron-builder install-app-deps', {
  stdio: 'inherit',
  env: process.env,
  cwd: path.join(__dirname, '..')
})
