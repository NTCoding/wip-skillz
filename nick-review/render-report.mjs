// Renders a nick-review report. Every finding is written into the HTML, so the
// page reads with JavaScript switched off.
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { highlighter } from './highlight.mjs'

const [,, dataPath, outPath] = process.argv
const d = JSON.parse(readFileSync(dataPath, 'utf8'))
const { iid, title, url, author, spec, specUrl, files, summary, findings } = d

const BANDS = [
  { n: 1, title: 'Slam dunk', lede: 'Obvious, and the fix is in the block. Agree and I apply it.' },
  { n: 2, title: 'You might want a look', lede: 'Agreed unless you reject it. Leave these alone and I treat every one of them as agreed.' },
  { n: 3, title: 'Needs you first', lede: 'I cannot settle these from the diff. Each one asks you a question.' },
]

// `before` is the code as it is, so a line in it is either unchanged or going
// away. `after` is the code as proposed, so a line in it is either unchanged or
// new. A green line in `before`, or a red one in `after`, says the two blocks
// disagree about which side they are, which is what makes a diff unreadable.
for (const f of findings) {
  const wrong = (rows, bad, side) => rows
    .filter(([k]) => k === bad)
    .map(([, t]) => `  ${side}: ${t.slice(0, 60)}`)
  const bad = [...wrong(f.before, 'add', 'before has an added line'),
               ...wrong(f.after, 'del', 'after has a removed line')]
  if (bad.length) {
    throw new Error(`${f.id} (${f.file}:${f.line}) marks a line on the wrong side:\n${bad.join('\n')}`)
  }
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
// A pure deletion has an empty `after`: the lines go away and nothing
// replaces them.
const gone = '<p class="gone">These lines go away, and nothing replaces them.</p>'

const code = (rows, paint) => !rows.length ? gone
  : '<pre>' + rows.map(([k, t]) =>
    `<span class="ln ${k}"><span class="sig">${k === 'add' ? '+' : k === 'del' ? '-' : ' '}</span> ${paint(t)}</span>`).join('') + '</pre>'

// A finding about prose shows prose: a serif, no syntax colours, and the
// change marked by the edge of the line rather than by a + or a -.
const prose = rows => !rows.length ? gone
  : '<div class="prose">' + rows.map(([k, t]) =>
    `<p class="pl ${k}">${esc(t) || '&nbsp;'}</p>`).join('') + '</div>'

const block = (f, rows, paint) => f.kind === 'text' ? prose(rows) : code(rows, paint)

const card = f => { const paint = highlighter(f.file); return `
      <details class="card" id="${esc(f.id)}" data-band="${f.band}">
        <summary class="top">
          <svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="chip b${f.band}">${esc(f.cls)}</span>
          <span class="loc">
            <span class="path"><b>${esc(f.file)}</b>${f.line ? ':' + f.line : ''}</span>
            <span class="claim">${esc(f.claim)}</span>
          </span>
          <span class="state"></span>
        </summary>
        <div class="body">
          <div class="lbl">How I know</div>
          <ul class="why">${(Array.isArray(f.why) ? f.why : [f.why]).map(w => `<li>${w}</li>`).join('')}</ul>
          <div class="cols">
            <div><div class="lbl">What is there now</div>${block(f, f.before, paint)}</div>
            <div><div class="lbl">Suggested</div>${block(f, f.after, paint)}</div>
          </div>
          ${f.question ? `<div class="note ask"><div class="lbl">The question for you</div>${esc(f.question)}</div>` : ''}
          <div class="note"><div class="lbl">Why it matters</div>${esc(f.comment)}</div>
          <label class="resp">
            <span class="lbl">Your response</span>
            <textarea class="say" data-id="${esc(f.id)}" rows="3" autocomplete="off" placeholder="${esc(f.band === 2 ? 'Leave this empty and I treat it as agreed.' : 'What do you want me to do with this?')}"></textarea>
          </label>
        </div>
      </details>` }

const band = b => {
  const fs = findings.filter(f => f.band === b.n)
  return `
    <section class="band" data-band="${b.n}">
      <h2><span class="dot d${b.n}"></span>${esc(b.title)} <span class="count">${fs.length}</span></h2>
      <p class="lede">${esc(b.lede)}</p>
      ${fs.length ? fs.map(card).join('') : '<p class="empty">Nothing in this band.</p>'}
    </section>`
}

// Each render gets its own storage slot, so a report never reads what an
// earlier one left in this browser.
const RUN = randomUUID()

const count = n => findings.filter(f => f.band === n).length

const list = (label, items) => items?.length ? `
          <div class="lbl">${label}</div>
          <ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''

const overview = () => `
      <details class="card sum">
        <summary class="top">
          <svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="loc">
            <span class="claim">Summary of this review</span>
            <span class="path">${count(1)} slam dunk · ${count(2)} might want a look · ${count(3)} need you</span>
          </span>
        </summary>
        <div class="body">
          <div class="lbl">What this merge request does</div>
          <p class="why">${esc(summary.what)}</p>
          ${list('What I read it against', summary.checked)}
          ${list('What I could not check', summary.couldNotCheck)}
          ${summary.verdict ? `<div class="lbl">Where I come out</div><p class="why">${esc(summary.verdict)}</p>` : ''}
        </div>
      </details>`
// The feedback Nick pastes back names this file, so the session he pastes it
// into reads the evidence and the suggested fix from it by id.
const DATA = resolve(dataPath)

const META = findings.map(f =>
  ({ id: f.id, band: f.band, file: f.file, line: f.line, claim: f.claim }))

writeFileSync(outPath, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>!${iid} · nick-review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap">
<style>${readFileSync(new URL('./report.css', import.meta.url), 'utf8')}</style>
</head>
<body>
<header>
  <div class="hdr">
    <div class="eyebrow">nick-review · first pass</div>
    <h1><a href="${esc(url)}">!${iid} ${esc(title)}</a></h1>
    <div class="sub">
      ${findings.length} findings · ${files} changed files · ${esc(author)} ·
      spec <a href="${esc(specUrl)}">${esc(spec)}</a> ·
      <a href="${esc(url)}/diffs">the diff</a>
    </div>
    <p class="howto">A first pass over this merge request, for you to read before you review it. Open a
      finding, type a response where you want one, leave the rest alone, then click
      <b>Build my feedback</b> at the bottom and paste it into Claude.</p>
    <nav class="tabs">
      <button class="tab" aria-selected="true" data-band="all">All <span class="count">${findings.length}</span></button>
      <button class="tab" aria-selected="false" data-band="1"><span class="dot d1"></span>Slam dunk <span class="count">${count(1)}</span></button>
      <button class="tab" aria-selected="false" data-band="2"><span class="dot d2"></span>Might want a look <span class="count">${count(2)}</span></button>
      <button class="tab" aria-selected="false" data-band="3"><span class="dot d3"></span>Needs you <span class="count">${count(3)}</span></button>
    </nav>
  </div>
</header>

<main class="wrap">
    <section class="band" data-band="0">${overview()}</section>${BANDS.map(band).join('')}</main>

<footer>
  <div class="fwrap">
    <div class="tally"><b id="nSaid">0</b> of ${findings.length} noted</div>
    <span class="spacer"></span>
    <div class="keys"><span><kbd>j</kbd><kbd>k</kbd> move between findings</span></div>
    <button class="primary" id="brief">Build my feedback</button>
  </div>
</footer>

<dialog id="out">
  <div class="dlg">
    <h3>Your feedback</h3>
    <p>Paste this back into the session and we talk it through.</p>
    <textarea id="outText" readonly></textarea>
    <div class="acts"><button class="act" id="doCopy">Copy</button><button class="act" id="shut">Close</button></div>
  </div>
</dialog>

<script>
const IID = ${iid}
const RUN = ${JSON.stringify(RUN)}
const MR = ${JSON.stringify({ url, title, author, spec })}
const DATA = ${JSON.stringify(DATA)}
const META = ${JSON.stringify(META)}
${readFileSync(new URL('./report.js', import.meta.url), 'utf8')}
</script>
</body>
</html>
`)
console.log(`wrote ${outPath}, ${findings.length} findings`)
