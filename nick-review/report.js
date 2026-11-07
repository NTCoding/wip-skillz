// The page talks to nothing. What you type is kept in this browser's
// localStorage, and the button at the bottom puts the markdown on your
// clipboard for you to paste back into the session.
const KEY = 'nick-review:' + RUN

let notes = {}
try {
  const kept = JSON.parse(localStorage.getItem(KEY) || '{}')
  for (const [id, text] of Object.entries(kept)) {
    if (typeof text === 'string' && text.trim()) notes[id] = text
  }
} catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(notes)) } catch {} }

const cards = () => [...document.querySelectorAll('.card')]
const shown = () => cards().filter(c => c.closest('.band').style.display !== 'none')

function paint () {
  for (const c of cards()) c.classList.toggle('said', Boolean(notes[c.id]?.trim()))
  nSaid.textContent = Object.values(notes).filter(t => t.trim()).length
}

for (const box of document.querySelectorAll('.say')) {
  box.value = notes[box.dataset.id] || ''
  box.addEventListener('input', () => {
    notes[box.dataset.id] = box.value
    save(); paint()
  })
}

let cur = 0
function focus (i) {
  const v = shown(); if (!v.length) return
  cur = Math.max(0, Math.min(i, v.length - 1))
  cards().forEach(c => c.classList.remove('cur'))
  v[cur].classList.add('cur')
  v[cur].scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  v[cur].querySelector('summary').focus({ preventScroll: true })
}

document.addEventListener('click', e => {
  const tab = e.target.closest('.tab')
  if (!tab) return
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)))
  // band 0 is the summary, which stays whichever band is being filtered to
  document.querySelectorAll('.band').forEach(s => {
    s.style.display = (s.dataset.band === '0' || tab.dataset.band === 'all' ||
      s.dataset.band === tab.dataset.band) ? '' : 'none'
  })
  focus(0)
})

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.target.tagName === 'TEXTAREA') return
  if (e.key === 'j') { focus(cur + 1); e.preventDefault() }
  else if (e.key === 'k') { focus(cur - 1); e.preventDefault() }
})

// Only what Nick typed goes into the feedback. A finding he left alone is
// absent from it, which the bands already give a meaning to.
//
// The entries stay short. They name the findings file, so the session Nick
// pastes them into reads each finding's evidence and suggested fix from it.
function feedback () {
  const said = f => (notes[f.id] || '').trim()
  const mine = META.filter(said)

  const entry = f => [
    `### ${f.file}:${f.line} — ${f.id}`,
    f.claim,
    '',
    said(f).split('\n').map(l => `> ${l}`).join('\n'),
    '',
  ].join('\n')

  return [
    `# Nick's feedback on the first pass of !${IID}`,
    '',
    `Findings: ${DATA}`,
    `Read that file for each finding's evidence and suggested fix, keyed by the id below.`,
    `Merge request: ${MR.url}`,
    '',
    `He responded to ${mine.length} of ${META.length} findings. One that is absent he left alone,`,
    `which in the band "you might want a look" means he agreed with it.`,
    '',
    ...mine.map(entry),
  ].join('\n')
}

brief.addEventListener('click', () => { outText.value = feedback(); out.showModal() })

doCopy.addEventListener('click', () => { outText.select(); navigator.clipboard?.writeText(outText.value) })
shut.addEventListener('click', () => out.close())

for (const c of cards()) c.open = false
paint()
