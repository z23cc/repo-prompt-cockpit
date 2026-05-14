import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function listTrackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  return output.split('\u0000').filter(Boolean)
}

const trackedFiles = listTrackedFiles()

const forbiddenPathChecks = [
  { reason: 'tracked .omx local state', test: (file) => file === '.omx' || file.startsWith('.omx/') },
  { reason: 'tracked prompt-exports local state', test: (file) => file === 'prompt-exports' || file.startsWith('prompt-exports/') },
  { reason: 'tracked local Claude settings', test: (file) => file === '.claude/settings.local.json' },
  { reason: 'tracked SwiftPM build artifact', test: (file) => file === '.build' || file.startsWith('.build/') },
  { reason: 'tracked release output', test: (file) => file === 'release' || file.startsWith('release/') },
  { reason: 'retired Electron/TypeScript source', test: (file) => file === 'src' || file.startsWith('src/') || file === 'electron-main.cjs' },
]

const forbiddenContentChecks = [
  { reason: 'absolute machine path leakage (/Users/zakelfassi)', test: (content) => content.includes('/Users/zakelfassi') },
  {
    reason: 'absolute machine path leakage (/Users/*, /home/*, /root/*, /private/var/folders/*)',
    test: (content) => content.includes('/Users/') || content.includes('/home/') || content.includes('/root/') || content.includes('/private/var/folders/'),
  },
]

const contentScanAllowlist = new Set(['scripts/check-release-hygiene.mjs'])
const violations = []

const gitignore = readFileSync('.gitignore', 'utf8')
const requiredGitignoreEntries = ['.build/', 'release/']
for (const entry of requiredGitignoreEntries) {
  if (!gitignore.split(/\r?\n/).includes(entry)) violations.push(`.gitignore (missing required ignore entry: ${entry})`)
}

for (const file of trackedFiles) {
  for (const check of forbiddenPathChecks) {
    if (check.test(file)) {
      violations.push(`${file} (${check.reason})`)
      break
    }
  }

  if (contentScanAllowlist.has(file)) continue

  let content = ''
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  for (const check of forbiddenContentChecks) {
    if (check.test(content)) {
      violations.push(`${file} (${check.reason})`)
      break
    }
  }
}

if (violations.length > 0) {
  console.error('Release hygiene check failed. Remove local-state leakage from tracked files:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Release hygiene check passed.')
