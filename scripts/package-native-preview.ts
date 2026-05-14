import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { arch, platform } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

interface PackageMetadata {
  productName?: string
  version?: string
  description?: string
  license?: string
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nativeRoot = join(repoRoot, 'Native')
const releaseParent = join(repoRoot, 'release')
const workRoot = join(releaseParent, 'native-preview')
const executableName = 'RepoPromptCockpitApp'
const appName = 'Repo Prompt Cockpit Native'
const bundleIdentifier = 'com.repoprompt.cockpit.native'
const artifactArch = arch() === 'x64' ? 'x64' : arch() === 'arm64' ? 'arm64' : arch()
const packageMetadata = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as PackageMetadata
const version = packageMetadata.version ?? 'unknown'
const appPath = join(workRoot, `${appName}.app`)
const contentsPath = join(appPath, 'Contents')
const macOSPath = join(contentsPath, 'MacOS')
const resourcesPath = join(contentsPath, 'Resources')
const dmgRoot = join(workRoot, 'dmg-root')
const stagedAppPath = join(dmgRoot, basename(appPath))
const appExecutablePath = join(macOSPath, executableName)
const customBundleIconFile = 'repoprompt-cockpit.icns'
let bundleIconFile: string | undefined = customBundleIconFile
const logoPngPath = join(repoRoot, 'src', 'renderer', 'assets', 'repoprompt-cockpit-logo.png')
const bundleIconPath = join(resourcesPath, customBundleIconFile)
const iconsetPath = join(workRoot, 'repoprompt-cockpit-native.iconset')
const zipPath = join(releaseParent, `repo-prompt-cockpit-native-${version}-mac-${artifactArch}.zip`)
const dmgPath = join(releaseParent, `repo-prompt-cockpit-native-${version}-mac-${artifactArch}.dmg`)
const tarPath = join(releaseParent, `repo-prompt-cockpit-native-${version}-mac-${artifactArch}.tar.gz`)
const args = new Set(process.argv.slice(2))
const shouldZip = !args.has('--skip-zip')
const shouldDmg = args.has('--dmg') && !args.has('--skip-dmg')
let didAdhocSign = false

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function run(command: string, args: string[], options: { capture?: boolean; optional?: boolean } = {}): string {
  console.log(`$ ${[command, ...args].join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })

  if (result.status !== 0) {
    if (options.optional) return ''
    fail(`Command failed: ${command} ${args.join(' ')}`)
  }

  return (result.stdout ?? '').trim()
}

function commandExists(command: string): boolean {
  const result = spawnSync('/usr/bin/env', ['sh', '-c', `command -v ${command} >/dev/null 2>&1`], {
    cwd: repoRoot,
    stdio: 'ignore',
  })
  return result.status === 0
}

function tryRun(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit' })
  return result.status === 0
}

function requirePath(path: string, description: string): void {
  if (!existsSync(path)) fail(`Expected ${description} is missing: ${path}`)
}

function escapePlistValue(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function writeInfoPlist(): void {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleDisplayName</key>
  <string>${escapePlistValue(appName)}</string>
  <key>CFBundleExecutable</key>
  <string>${escapePlistValue(executableName)}</string>
  <key>CFBundleIdentifier</key>
  <string>${escapePlistValue(bundleIdentifier)}</string>
  ${bundleIconFile ? `<key>CFBundleIconFile</key>\n  <string>${escapePlistValue(bundleIconFile)}</string>` : ''}
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>${escapePlistValue(appName)}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${escapePlistValue(version)}</string>
  <key>CFBundleVersion</key>
  <string>${escapePlistValue(version)}</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSHumanReadableCopyright</key>
  <string>${escapePlistValue(appName)} preview build</string>
</dict>
</plist>
`

  writeFileSync(join(contentsPath, 'Info.plist'), plist)
  writeFileSync(join(contentsPath, 'PkgInfo'), 'APPL????')
}

function writeBundleIcon(): void {
  if (!existsSync(logoPngPath)) {
    bundleIconFile = undefined
    console.warn(`Native app icon source missing; continuing without CFBundleIconFile: ${logoPngPath}`)
    return
  }
  if (!commandExists('sips') || !commandExists('iconutil')) {
    bundleIconFile = undefined
    console.warn('sips/iconutil unavailable; continuing without a native .icns bundle icon.')
    return
  }

  rmSync(iconsetPath, { recursive: true, force: true })
  mkdirSync(iconsetPath, { recursive: true })
  const iconFiles: Array<{ size: number; scale: 1 | 2; filename: string }> = [
    { size: 16, scale: 1, filename: 'icon_16x16.png' },
    { size: 16, scale: 2, filename: 'icon_16x16@2x.png' },
    { size: 32, scale: 1, filename: 'icon_32x32.png' },
    { size: 32, scale: 2, filename: 'icon_32x32@2x.png' },
    { size: 128, scale: 1, filename: 'icon_128x128.png' },
    { size: 128, scale: 2, filename: 'icon_128x128@2x.png' },
    { size: 256, scale: 1, filename: 'icon_256x256.png' },
    { size: 256, scale: 2, filename: 'icon_256x256@2x.png' },
    { size: 512, scale: 1, filename: 'icon_512x512.png' },
    { size: 512, scale: 2, filename: 'icon_512x512@2x.png' },
  ]
  for (const iconFile of iconFiles) {
    const pixels = String(iconFile.size * iconFile.scale)
    run('sips', ['-z', pixels, pixels, logoPngPath, '--out', join(iconsetPath, iconFile.filename)])
  }
  if (!tryRun('iconutil', ['-c', 'icns', iconsetPath, '-o', bundleIconPath])) {
    bundleIconFile = undefined
    console.warn('Native app icon generation failed; continuing without CFBundleIconFile.')
  }
  rmSync(iconsetPath, { recursive: true, force: true })
}

function writeReadme(): void {
  const readme = [
    'Repo Prompt Cockpit native macOS preview',
    `Version: ${version}`,
    '',
    `App bundle: ${appName}.app`,
    `Bundle identifier: ${bundleIdentifier}`,
    'Ad-hoc codesign: attempted when codesign is available',
    '',
    'This is an unsigned, non-notarized native preview bundle for internal validation.',
    shouldDmg ? `DMG artifact: ${basename(dmgPath)}` : 'DMG creation skipped by default; run pnpm native:package:dmg when a disk image is needed.',
    'The Electron preview packaging path remains preserved separately.',
    '',
    'Validation gate:',
    '  swift build --package-path Native -c release',
    '  swift run --package-path Native RepoPromptCockpitChecks',
    '  pnpm native:package:preview',
    '',
  ].join('\n')

  writeFileSync(join(resourcesPath, 'README.txt'), readme)
  writeFileSync(join(workRoot, 'README.txt'), readme)
}

function validateAppBundle(pathToApp = appPath): void {
  const infoPlistPath = join(pathToApp, 'Contents', 'Info.plist')
  const executablePath = join(pathToApp, 'Contents', 'MacOS', executableName)
  requirePath(pathToApp, 'native app bundle')
  requirePath(infoPlistPath, 'native app Info.plist')
  requirePath(executablePath, 'native app executable')
  if (bundleIconFile) requirePath(join(pathToApp, 'Contents', 'Resources', bundleIconFile), 'native app icon')

  const executableMode = statSync(executablePath).mode
  if ((executableMode & 0o111) === 0) fail(`Native app executable is not executable: ${executablePath}`)

  if (commandExists('plutil')) run('plutil', ['-lint', infoPlistPath])
  if (didAdhocSign && commandExists('codesign')) {
    run('codesign', ['--verify', '--strict', '--verbose=2', pathToApp])
  }
}

if (platform() !== 'darwin') {
  fail('Native macOS preview packaging must be run on macOS because it assembles and validates a .app bundle.')
}

run('swift', ['build', '--package-path', nativeRoot, '-c', 'release'])
run('swift', ['run', '--package-path', nativeRoot, 'RepoPromptCockpitChecks'])

const binPath = execFileSync('swift', ['build', '--package-path', nativeRoot, '-c', 'release', '--show-bin-path'], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
}).trim()
const builtExecutable = join(binPath, executableName)
requirePath(builtExecutable, 'release native executable')

rmSync(workRoot, { recursive: true, force: true })
rmSync(zipPath, { force: true })
rmSync(tarPath, { force: true })
rmSync(dmgPath, { force: true })
mkdirSync(macOSPath, { recursive: true })
mkdirSync(resourcesPath, { recursive: true })
mkdirSync(releaseParent, { recursive: true })

copyFileSync(builtExecutable, appExecutablePath)
chmodSync(appExecutablePath, 0o755)
writeBundleIcon()
writeInfoPlist()
writeReadme()

if (commandExists('codesign')) {
  console.log(`$ codesign --force --sign - ${appPath}`)
  didAdhocSign = tryRun('codesign', ['--force', '--sign', '-', appPath])
}

validateAppBundle()

if (shouldZip) {
  run('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appPath, zipPath])
}
run('tar', ['-czf', tarPath, '-C', workRoot, basename(appPath), 'README.txt'])

if (shouldDmg) {
  mkdirSync(dmgRoot, { recursive: true })
  run('ditto', [appPath, stagedAppPath])
  validateAppBundle(stagedAppPath)
  run('hdiutil', ['create', '-volname', appName, '-srcfolder', dmgRoot, '-ov', '-format', 'UDZO', dmgPath])
}

console.log(`Packaged native ${appName} ${version} for macOS ${artifactArch}:`)
console.log(`- ${appPath}`)
if (shouldZip) console.log(`- ${zipPath}`)
console.log(`- ${tarPath}`)
if (shouldDmg) console.log(`- ${dmgPath}`)
if (!shouldDmg) console.log('DMG creation skipped by default; run `pnpm native:package:dmg` on macOS if a disk image is needed.')
console.log('Developer ID signing and notarization were not performed for this private preview build.')
