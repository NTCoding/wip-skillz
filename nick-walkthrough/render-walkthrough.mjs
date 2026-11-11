import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve, basename } from 'node:path'
import { highlighter } from '../nick-review/highlight.mjs'

const [,, srcPath, outPath] = process.argv
const src = readFileSync(srcPath, 'utf8')

const front = /^---\n([\s\S]*?)\n---\n/.exec(src)
if (!front) throw new Error('the walkthrough has no front matter')
const meta = Object.fromEntries(front[1].split('\n').filter(Boolean).map(l => {
  const i = l.indexOf(':')
  return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
}))
for (const key of ['iid', 'title', 'url', 'author', 'base', 'head']) {
  if (!meta[key]) throw new Error(`the front matter has no "${key}"`)
}
const CONTEXTS = front[1].split('\n').filter(l => l.startsWith('context:')).map((l, i) => {
  const [prefix, name, pkg] = l.slice('context:'.length).split('=').map(s => s.trim())
  return { prefix, name, pkg, n: i % 6 }
})
if (!CONTEXTS.length) throw new Error('the front matter has no "context:" line. Write one per context: "context: <path prefix> = <name> = <package name>"')
const contextOf = file => CONTEXTS.filter(c => file.startsWith(c.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0]
const REPO = meta.url.replace(/\/-\/merge_requests\/.*$/, '')

// ── git ──────────────────────────────────────────────────────────────────
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const fileCache = new Map()
function fileAt (ref, file) {
  const key = `${ref}:${file}`
  if (!fileCache.has(key)) {
    let text
    try { text = git('show', key) } catch { text = undefined }
    fileCache.set(key, text === undefined ? undefined : text.split('\n'))
  }
  return fileCache.get(key)
}

const changed = new Map()
for (const row of git('diff', '--numstat', '-M', meta.base, meta.head).split('\n').filter(Boolean)) {
  const [added, removed, ...rest] = row.split('\t')
  changed.set(rest[rest.length - 1], { added: Number(added) || 0, removed: Number(removed) || 0, status: 'M', shownIn: new Set() })
}
for (const row of git('diff', '--name-status', '-M', meta.base, meta.head).split('\n').filter(Boolean)) {
  const [status, ...rest] = row.split('\t')
  const entry = changed.get(rest[rest.length - 1])
  if (entry) entry.status = status[0]
}

const addedCache = new Map()
function addedLines (file) {
  if (!addedCache.has(file)) {
    const set = new Set()
    if (changed.has(file)) {
      for (const m of git('diff', '-U0', meta.base, meta.head, '--', file).matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
        const start = Number(m[1]); const count = m[2] === undefined ? 1 : Number(m[2])
        for (let n = start; n < start + count; n++) set.add(n)
      }
    }
    addedCache.set(file, set)
  }
  return addedCache.get(file)
}

const symbols = new Map()
const baseNames = new Map()
const methods = new Map()
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'super', 'constructor', 'catch', 'throw', 'await'])
function index (file) {
  const name = basename(file)
  baseNames.set(name, baseNames.has(name) ? null : file)
  if (!/\.(ts|tsx|mjs|js)$/.test(file)) return
  const lines = fileAt(meta.head, file)
  if (!lines) return
  lines.forEach((line, i) => {
    const m = /^export (?:default )?(?:abstract )?(?:async )?(?:class|interface|type|const|function|enum) (\w+)/.exec(line)
    if (m && !symbols.has(m[1])) symbols.set(m[1], { file, line: i + 1 })
    const method = /^  (?:static |private |readonly |async |get )*(#?[a-z]\w*)(?:<[^>]*>)?\(/.exec(line)
    if (method && !KEYWORDS.has(method[1])) methods.set(method[1], methods.has(method[1]) ? null : { file, line: i + 1 })
  })
}
for (const [file, entry] of changed) if (entry.status !== 'D') index(file)

const blob = (file, line, ref = meta.head) => `${REPO}/-/blob/${ref}/${file}${line ? `#L${line}` : ''}`

// ── inline text ──────────────────────────────────────────────────────────
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function target (name) {
  const head = name.split(/[.(<]/)[0]
  const found = symbols.get(name) ?? symbols.get(head) ?? methods.get(name) ?? methods.get(name.split('.').pop())
  if (found) return blob(found.file, found.line)
  if (changed.has(name)) return blob(name)
  if (/^[\w.-]+(\/[\w.-]+)+$/.test(name) && fileAt(meta.head, name)) return blob(name)
  const file = baseNames.get(name)
  return file ? blob(file) : undefined
}

const CONTEXT_NAMES = new RegExp(CONTEXTS.map(c => esc(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|'), 'g')
const badges = text => text.split(/(`[^`]+`)/).map((part, i) => i % 2 ? part
  : part.replace(CONTEXT_NAMES, name => `<span class="ctx inl c${CONTEXTS.find(c => esc(c.name) === name).n}">${name}</span>`)).join('')

function inline (text) {
  return badges(esc(text))
    .replace(/`([^`]+)`/g, (_, code) => {
      const raw = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      const href = target(raw)
      return href ? `<a class="sym" href="${esc(href)}"><code>${code}</code></a>` : `<code>${code}</code>`
    })
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
      `<a href="${/^https?:|^#/.test(href) ? href : esc(blob(href))}">${label}</a>`)
}

// ── the markdown source ──────────────────────────────────────────────────
const tabs = []
let tab; let point; let para = []
const errors = []

const MAX_SENTENCES = 3
const MAX_WORDS = 60
const flush = () => {
  if (!para.length) return
  const text = para.join(' ')
  const sentences = (text.replace(/`[^`]*`/g, 'x').match(/[.?!](?=\s|$)|:$/g) || []).length
  const words = text.split(/\s+/).length
  if (sentences > MAX_SENTENCES || words > MAX_WORDS) errors.push(`under "${point?.title || tab.title}": this paragraph has ${sentences} sentences and ${words} words. The limit is ${MAX_SENTENCES} sentences and ${MAX_WORDS} words:\n    ${text.slice(0, 90)}…`)
  push({ type: 'text', text })
  para = []
}
const push = block => {
  if (!point) { point = { title: '', blocks: [] }; tab.points.push(point) }
  point.blocks.push(block)
}

const lines = src.slice(front[0].length).split('\n')
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line.startsWith('# ')) { flush(); tab = { title: line.slice(2).trim(), points: [] }; tabs.push(tab); point = undefined; continue }
  if (!tab) { if (line.trim()) throw new Error(`line before the first "# " heading: ${line}`); continue }
  if (line.startsWith('## ')) { flush(); const named = /^(.*?)\s*\{([^}]+)\}$/.exec(line.slice(3).trim()); point = { title: named ? named[1] : line.slice(3).trim(), short: named?.[2], blocks: [] }; tab.points.push(point); continue }
  if (line.startsWith('```')) {
    flush()
    const [lang = '', file, ref] = line.slice(3).trim().split(/\s+/)
    const body = []
    for (i++; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i])
    push(lang === 'flow' ? { type: 'flow', body } : { type: 'code', lang, file, ref: ref === '@base' ? 'base' : 'head', body })
    continue
  }
  if (line.startsWith('|')) {
    flush()
    const rows = []
    for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i].slice(1, lines[i].lastIndexOf('|')).split('|').map(c => c.trim()))
    i--
    push({ type: 'table', head: rows[0], rows: rows.slice(2) })
    continue
  }
  if (line.startsWith('>')) {
    flush()
    const body = []
    for (; i < lines.length && lines[i].startsWith('>'); i++) body.push(lines[i].replace(/^>\s?/, ''))
    i--
    const text = body.join(' ').trim()
    push(text.startsWith('⚠️') ? { type: 'attention', text: text.slice(2).trim() } : { type: 'quote', text })
    continue
  }
  if (/^(\d+\.|-) /.test(line)) {
    flush()
    const items = []; const ordered = /^\d/.test(line)
    for (; i < lines.length && /^(\d+\.|-) /.test(lines[i]); i++) items.push(lines[i].replace(/^(\d+\.|-) /, ''))
    i--
    push({ type: 'list', ordered, items })
    continue
  }
  if (!line.trim()) { flush(); continue }
  para.push(line.trim())
}
flush()

// ── code blocks ──────────────────────────────────────
const GAP = /^\s*(\/\/|#)?\s*…\s*$/

function locate (block, where) {
  if (!block.file) return block.body.map(text => ({ text }))
  const ref = block.ref === 'base' ? meta.base : meta.head
  const fileLines = fileAt(ref, block.file)
  if (!fileLines) { errors.push(`${where}: ${block.file} doesn't exist at ${block.ref}`); return [] }
  if (!contextOf(block.file)) errors.push(`${where}: ${block.file} isn't under any "context:" line of the front matter`)
  const trimmed = fileLines.map(l => l.trim())
  const added = block.ref === 'base' ? new Set() : addedLines(block.file)
  let cursor = 0
  return block.body.map(raw => {
    const [text, note] = raw.split(' //~ ')
    if (GAP.test(text)) return { gap: true }
    if (!text.trim()) return { text: '' }
    let at = trimmed.indexOf(text.trim(), cursor)
    if (at === -1) at = trimmed.indexOf(text.trim())
    if (at === -1) { errors.push(`${where}: this line isn't in ${block.file} at ${block.ref}:\n    ${text.trim()}`); return { text, note } }
    cursor = at + 1
    return { text, note, n: at + 1, add: added.has(at + 1) }
  })
}

let attention = 0
tabs.forEach((t, ti) => t.points.forEach((p, pi) => {
  p.id = `t${ti + 1}p${pi + (t.points[0].title ? 1 : 0)}`
  p.blocks.forEach((b, bi) => {
    b.id = `${p.id}.b${bi + 1}`
    if (b.type === 'attention') { p.attention = true; attention++ }
    if (b.type !== 'code') return
    b.rows = locate(b, `"${p.title}", block ${bi + 1}`)
    b.first = b.rows.find(r => r.n)?.n
    if (b.file && changed.has(b.file) && b.ref === 'head') changed.get(b.file).shownIn.add(p.id)
  })
}))
if (errors.length) throw new Error(`${errors.length} problems in the source:\n\n${errors.join('\n\n')}`)

// ── html ─────────────────────────────────────────────────────────────────
const STATUS = { A: ['new file', 'b1'], M: ['changed', 'b2'], R: ['renamed', 'b2'], D: ['deleted', 'b3'] }
const FOLD = 22

function linkTypes (html, own) {
  return html.replace(/<span class="t-(type|fn)">([\w$]+)<\/span>/g, (all, kind, name) => {
    const sym = symbols.get(name)
    if (!sym || (sym.file === own.file && sym.line === own.n)) return all
    return `<a class="t-${kind} sym" href="${esc(blob(sym.file, sym.line))}">${name}</a>`
  })
}

function codeBlock (b) {
  const paint = highlighter(b.file || `x.${b.lang}`)
  const entry = b.file && changed.get(b.file)
  const isNew = entry?.status === 'A'
  const [label, cls] = b.ref === 'base' ? ['target branch', 'b3']
    : entry ? STATUS[entry.status] ?? STATUS.M : ['unchanged', 'b0']
  const ref = b.ref === 'base' ? meta.base : meta.head
  const own = b.file && contextOf(b.file)
  const cross = text => CONTEXTS.filter(c => c !== own && c.pkg && text.includes(`'${c.pkg}'`)).map(c => `<span class="why cross">from the ${esc(c.name)}</span>`).join('')
  const rows = b.rows.map(r => r.gap
    ? '<span class="ln gap"><span class="no"></span>⋯</span>'
    : `<span class="ln${r.add && !isNew ? ' add' : ''}"><span class="no">${r.n ?? ''}</span>${linkTypes(paint(r.text), { file: b.file, n: r.n }) || ' '}${r.note ? `<span class="why">${inline(r.note)}</span>` : ''}${cross(r.text)}</span>`).join('')
  const name = b.file ? b.file.split('/').pop() : ''
  const dir = b.file ? b.file.slice(0, -name.length) : ''
  const head = b.file ? `
        <div class="file">
          ${own ? `<span class="ctx c${own.n}">${esc(own.name)}</span>` : ''}
          <a class="fpath" href="${esc(blob(b.file, b.first, ref))}" title="${esc(b.file)}"><span class="dir">${esc(dir)}</span><b>${esc(name)}</b></a>
          <span class="chip ${cls}">${label}</span>
          <button class="copy" type="button">Copy</button>
        </div>` : ''
  const fold = b.rows.length > FOLD
  return `<div class="code${fold ? ' folded' : ''}">${head}<pre>${rows}</pre>${fold ? `<button class="unfold" type="button">Show all ${b.rows.length} lines</button>` : ''}</div>`
}

function flowSvg (b) {
  const steps = b.body.filter(l => l.trim()).map(l => {
    const m = /^(.+?)\s*(-->|->)\s*(.+?):\s*(.+?)(?:\s+@(\d+))?$/.exec(l.trim())
    if (!m) throw new Error(`this line of a flow block isn't "<from> -> <to>: <label> @<point>":\n  ${l}`)
    return { from: m[1], dashed: m[2] === '-->', to: m[3], label: m[4], point: m[5] }
  })
  const who = [...new Set(steps.flatMap(s => [s.from, s.to]))]
  const W = 1040; const col = W / who.length; const x = name => col * who.indexOf(name) + col / 2
  const top = 64; const gap = 46; const H = top + gap * steps.length + 24
  const head = who.map(name => `
    <rect x="${x(name) - 82}" y="8" width="164" height="36" rx="18" class="who"/>
    <text x="${x(name)}" y="31" text-anchor="middle" class="who-t">${esc(name)}</text>
    <line x1="${x(name)}" y1="44" x2="${x(name)}" y2="${H - 8}" class="life"/>`).join('')
  const arrows = steps.map((s, i) => {
    const y = top + gap * i + 22; const a = x(s.from); const z = x(s.to); const dir = z > a ? 1 : -1
    const left = Math.min(a, z)
    const inner = `
      ${s.point ? `<circle cx="${left + 20}" cy="${y - 14}" r="10" class="pt"/><text x="${left + 20}" y="${y - 10}" text-anchor="middle" class="pt-t">${s.point}</text>` : ''}
      <text x="${left + 38}" y="${y - 9}" class="msg">${esc(s.label)}</text>
      <line x1="${a}" y1="${y}" x2="${z - dir * 7}" y2="${y}" class="arrow${s.dashed ? ' dashed' : ''}"/>
      <path d="M${z} ${y} l${-dir * 9} -5 v10 z" class="tip${s.dashed ? ' dashed' : ''}"/>`
    return s.point ? `<a href="#" data-step="${s.point}" class="hop">${inner}</a>` : `<g>${inner}</g>`
  }).join('')
  return `<svg class="flow" viewBox="0 0 ${W} ${H}" role="img" aria-label="The calls of one request">${head}${arrows}</svg>`
}

const label = b => b.type === 'code' ? `${b.file ?? 'code'}${b.first ? ':' + b.first : ''}`
  : (b.text ?? b.items?.[0] ?? b.head?.join(' | ') ?? b.type).replace(/[`*]/g, '').slice(0, 90)

function evidence (b) {
  return b.type === 'code' ? codeBlock(b)
    : b.type === 'flow' ? flowSvg(b)
    : b.type === 'quote' ? `<blockquote>${inline(b.text)}</blockquote>`
    : b.type === 'list' ? `<${b.ordered ? 'ol' : 'ul'} class="ev-list">${b.items.map(item => `<li>${inline(item)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`
    : `<table><thead><tr>${b.head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

function say (text) {
  const cut = text.search(/(?<=[.:]) /)
  return cut === -1 ? `<p class="pt-line">${inline(text)}</p>`
    : `<p class="pt-line">${inline(text.slice(0, cut))}</p><p class="ex-line">${inline(text.slice(cut + 1))}</p>`
}

function passages (blocks) {
  const out = []
  let cur
  for (const b of blocks) {
    if (b.type === 'attention') { cur = undefined; out.push({ attention: b }); continue }
    if (b.type === 'text') {
      cur = { left: [b], right: [] }; out.push(cur)
    } else {
      if (!cur) { cur = { left: [], right: [] }; out.push(cur) }
      cur.right.push(b)
    }
  }
  return out
}

const META = []
const plain = text => inline(text).replace(/<a [^>]*>|<\/a>/g, '')
const ALERTS = tabs.flatMap(t => t.points.flatMap(p => p.blocks.filter(b => b.type === 'attention').map(block => ({ tab: t, point: p, block }))))
const shortOf = p => p.short ?? p.title.replace(/[`*]/g, '').split(' ').slice(0, 4).join(' ') + '…'
function passageHtml (p, point) {
  if (p.attention) {
    return `<div class="attn" id="${p.attention.id}"><span class="icon" aria-hidden="true">⚠️</span><p><b>Needs attention.</b> ${inline(p.attention.text)}</p></div>`
  }
  const first = p.left[0] ?? p.right[0]
  META.push({ id: first.id, point: point.title || 'Overview', label: label(first) })
  return `
      <div class="step${p.right.length ? '' : ' solo'}" id="${first.id}">
        <div class="tell">${p.left.map((b, i) => i ? `<p class="ex-line">${inline(b.text)}</p>` : say(b.text)).join('')}
          <button class="say-btn" type="button">💬 Comment on this</button>
          <textarea class="say" data-id="${first.id}" rows="3" hidden placeholder="Your comment is saved as you type. Read the other points, then click Collect all my feedback at the bottom."></textarea>
        </div>
        ${p.right.length ? `<div class="show">${p.right.map(evidence).join('')}</div>` : ''}
      </div>`
}

function pointHtml (p, n, t, ti) {
  if (!p.title) {
    const story = t.points.filter(q => q.title).map((q, i) => `
        <li><a href="#${q.id}" data-go="${q.id}">
          <span class="num">${i + 1}</span>
          <span class="card-body"><b>${plain(q.title)}${q.attention ? ' <span class="icon">⚠️</span>' : ''}</b>
          <span>${q.blocks[0]?.type === 'text' ? plain(q.blocks[0].text) : ''}</span></span>
        </a></li>`).join('')
    const flow = p.blocks.find(b => b.type === 'flow')
    const alerts = ti === 0 ? ALERTS : ALERTS.filter(a => a.tab === t)
    return `
    <section class="point overview" id="${p.id}">
      <div class="lead">${p.blocks.filter(b => b.type === 'text').map(b => `<p>${inline(b.text)}</p>`).join('')}</div>
      ${alerts.length ? `<div class="alerts"><h3>⚠️ ${alerts.length} ${alerts.length === 1 ? 'thing needs' : 'things need'} your attention</h3><ul>${alerts.map(a => `<li><a href="#${a.block.id}" data-go="${a.block.id}">${plain(a.block.text)}</a> <span class="dim">${esc(a.tab.title)} · ${plain(a.point.title)}</span></li>`).join('')}</ul></div>` : ''}
      ${flow ? flowSvg(flow) : ''}
      <ol class="story">${story}</ol>
    </section>`
  }
  const [lead, ...rest] = p.blocks
  const hasLead = lead?.type === 'text'
  return `
    <section class="point${p.attention ? ' has-attn' : ''}" id="${p.id}" data-n="${n}">
      <div class="phead">
        <span class="num big">${n}</span>
        <div><h2>${inline(p.title)}</h2>${hasLead ? `<p class="lead">${inline(lead.text)}</p>` : ''}</div>
        <label class="read"><input type="checkbox" data-id="${p.id}"> read</label>
      </div>
      ${passages(hasLead ? rest : p.blocks).map(x => passageHtml(x, p)).join('')}
      <div class="pager"><button class="act prev" type="button">← Previous</button><span class="spacer"></span><button class="primary next" type="button">Next →</button></div>
    </section>`
}

function filesTab () {
  const groups = new Map()
  for (const [file, entry] of changed) {
    const parts = file.split('/')
    const group = parts.length > 3 ? parts.slice(0, 3).join('/') : parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push([file, entry])
  }
  const titleOf = new Map(tabs.flatMap(t => t.points.map(p => [p.id, p.title])))
  const row = ([file, e], group) => `<tr class="${e.shownIn.size ? '' : 'unseen'}">
        <td><a class="sym" href="${esc(e.status === 'D' ? blob(file, 0, meta.base) : blob(file))}"><code>${esc(file.startsWith(group + '/') ? file.slice(group.length + 1) : file)}</code></a></td>
        <td><span class="chip ${(STATUS[e.status] ?? STATUS.M)[1]}">${(STATUS[e.status] ?? STATUS.M)[0]}</span></td>
        <td class="num-cell">+${e.added} −${e.removed}</td>
        <td>${[...e.shownIn].map(id => `<a href="#${id}" data-go="${id}">${inline(titleOf.get(id) || id).replace(/<a [^>]*>|<\/a>/g, '')}</a>`).join('<br>') || '<span class="dim">not shown</span>'}</td>
      </tr>`
  const shown = [...changed.values()].filter(e => e.shownIn.size).length
  return `
    <section class="point files-pt" id="files">
      <p class="lead">${shown} of the ${changed.size} changed files are shown in a code block of this walkthrough. A file that isn't shown has a grey row.</p>
      ${[...groups].map(([group, rows]) => `<details class="grp"><summary><code>${esc(group)}</code> <span class="count">${rows.length} files · ${rows.filter(([, e]) => e.shownIn.size).length} shown</span></summary>
      <table class="files"><tbody>${rows.map(r => row(r, group)).join('')}</tbody></table></details>`).join('')}
    </section>`
}

const tabHtml = (t, ti) => {
  let n = 0; let dots = 0
  const body = t.points.map(p => pointHtml(p, p.title ? ++n : 0, t, ti)).join('')
  return `
  <div class="pane" data-tab="${ti}" ${ti ? 'hidden' : ''}>
    <main>
      <ol class="line" aria-label="The points of this tab">
        ${t.points.map((p, i) => `<li><a href="#${p.id}" data-toc="${p.id}" title="${esc(p.title.replace(/[\`*]/g, '') || 'Overview')}"><span class="dot">${p.title ? ++dots : '◎'}</span><span class="lab">${p.title ? esc(shortOf(p)) : 'Overview'}${p.attention ? ' ⚠️' : ''}</span><span class="badge" data-badge="${p.id}"></span></a></li>`).join('')}
      </ol>
      ${body}
    </main>
  </div>`
}

const RUN = randomUUID()
const here = name => readFileSync(new URL(name, import.meta.url), 'utf8')
const panes = tabs.map(tabHtml).join('')

writeFileSync(outPath, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>!${esc(meta.iid)} · nick-walkthrough</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap">
<style>${here('../nick-review/report.css')}
${here('./walkthrough.css')}</style>
</head>
<body>
<div class="tabbar">
  <div class="hdr bar">
    <a class="mr" href="${esc(meta.url)}" title="${esc(meta.title)}"><b>!${esc(meta.iid)}</b> ${esc(meta.title)}</a>
    <nav class="tabs">
      ${tabs.map((t, i) => `<button class="tab" aria-selected="${i === 0}" data-tab="${i}">${esc(t.title)}${ALERTS.some(a => a.tab === t) ? ` <span class="warn">⚠️ ${ALERTS.filter(a => a.tab === t).length}</span>` : ''}</button>`).join('')}
      <button class="tab" aria-selected="false" data-tab="${tabs.length}">Every file <span class="count">${changed.size}</span></button>
    </nav>
  </div>
</div>

<div class="wrap">
  ${panes}
  <div class="pane" data-tab="${tabs.length}" hidden><main>${filesTab()}</main></div>
</div>

<footer>
  <div class="fwrap">
    <div class="tally"><b id="nRead">0</b> of <span id="nPoints"></span> read · <b id="nSaid">0</b> comments saved on this page</div>
    <span class="spacer"></span>
    <div class="keys"><span><kbd>j</kbd><kbd>k</kbd> next and previous point</span><span><kbd>r</kbd> read</span></div>
    <button class="primary" id="brief">Collect all my feedback</button>
  </div>
</footer>

<dialog id="out">
  <div class="dlg">
    <h3>Your feedback</h3>
    <p>This collects every comment that you typed on the page. To add one, close this and click <b>Comment on this</b> under a passage. Type anything else here:</p>
    <textarea id="general" class="say" rows="4" placeholder="General feedback on the walkthrough"></textarea>
    <p class="paste">Copy the block below and paste it into a Claude session. It contains the path of the walkthrough.</p>
    <textarea id="outText" readonly></textarea>
    <div class="acts"><button class="act" id="doCopy">Copy</button><button class="act" id="shut">Close</button></div>
  </div>
</dialog>

<script>
const IID = ${JSON.stringify(meta.iid)}
const RUN = ${JSON.stringify(RUN)}
const MR = ${JSON.stringify(meta.url)}
const SOURCE = ${JSON.stringify(resolve(srcPath))}
const PAGE = ${JSON.stringify(resolve(outPath))}
const REPO_DIR = ${JSON.stringify(process.cwd())}
const RENDERER = ${JSON.stringify(new URL(import.meta.url).pathname)}
const META = ${JSON.stringify(META).replace(/</g, '\\u003c')}
${here('./walkthrough.js')}
</script>
</body>
</html>
`)
console.log(`wrote ${outPath}: ${tabs.length} tabs, ${META.length} passages, ${changed.size} changed files`)
