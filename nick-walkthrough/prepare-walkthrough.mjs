import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const iid = process.argv[2]
if (!/^\d+$/.test(iid ?? '')) throw new Error('usage: node prepare-walkthrough.mjs <iid of the merge request>')

const run = (cmd, ...args) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'inherit'] }).trim()
const tryRun = (cmd, ...args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { return undefined } }

const mr = JSON.parse(run('glab', 'mr', 'view', iid, '-F', 'json'))
const merged = mr.state === 'merged'
run('git', 'fetch', 'origin', `merge-requests/${iid}/head`)
const head = run('git', 'rev-parse', 'FETCH_HEAD')
// A merged merge request doesn't have a target branch any more. So its base is read from GitLab.
// git merge-base reads the target branch so the target branch is fetched for an open merge request.
if (!merged) run('git', 'fetch', 'origin', mr.target_branch)

const target = `origin/${mr.target_branch}`
const cherry = !merged && mr.has_conflicts ? run('git', 'cherry', '-v', target, head) : ''
const firstNew = cherry.split('\n').find(l => l.startsWith('+'))?.split(' ')[1]
const base = merged ? mr.diff_refs.base_sha
  : mr.has_conflicts && firstNew ? run('git', 'rev-parse', `${firstNew}^`)
  : run('git', 'merge-base', target, head)

// The package.json in the root is the npm workspace rather than a context.
// So the search never looks in the root.
const found = new Map()
const packageIn = dir => {
  if (!found.has(dir)) {
    const json = tryRun('git', 'show', `${head}:${dir}/package.json`)
    found.set(dir, json ? { dir, name: JSON.parse(json).name } : undefined)
  }
  return found.get(dir)
}
const packageAbove = file => {
  const parts = file.split('/')
  for (let i = parts.length - 1; i > 0; i--) {
    const pkg = packageIn(parts.slice(0, i).join('/'))
    if (pkg) return pkg
  }
}

// A file in the root, such as package-lock.json, doesn't get a line.
const contexts = new Map()
const folders = new Set()
for (const file of run('git', 'diff', '--name-only', base, head).split('\n').filter(Boolean)) {
  if (!file.includes('/')) continue
  const pkg = packageAbove(file)
  if (pkg) contexts.set(pkg.dir, `context: ${pkg.dir} = ${pkg.dir.split('/').pop()} context${pkg.name ? ` = ${pkg.name}` : ''}`)
  else folders.add(`folder: ${file.split('/')[0]}`)
}

const pad = n => String(n).padStart(2, '0')
const now = new Date()
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
const dir = `${homedir()}/nick-walkthrough/${iid}-${stamp}`
const lines = [...[...contexts].sort(([a], [b]) => a.localeCompare(b)).map(([, line]) => line), ...[...folders].sort()]
mkdirSync(dir, { recursive: true })
writeFileSync(`${dir}/walkthrough.md`, ['---', `iid: ${iid}`, `title: ${mr.title}`, `url: ${mr.web_url}`, `author: ${mr.author.username}`, `base: ${base}`, `head: ${head}`, ...lines, '---', ''].join('\n'))

console.log([
  `wrote ${dir}/walkthrough.md`,
  `base ${base}`,
  'these lines are in the front matter:',
  ...lines.map(l => `  ${l}`),
  'check the label of each context line.',
  'add a line for each context that is called but not changed.',
  ...(cherry ? ['read this list before you use the base:', cherry] : []),
].join('\n'))
