const KEY = 'nick-walkthrough:' + RUN

let state = { notes: {}, read: {} }
try {
  const kept = JSON.parse(localStorage.getItem(KEY) || '{}')
  state = { notes: kept.notes || {}, read: kept.read || {}, toc: kept.toc }
} catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {} }

const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const said = id => (state.notes[id] || '').trim()
const numbered = () => $$('.point[data-n]')

function paint () {
  for (const step of $$('.step')) step.classList.toggle('said', Boolean(said(step.id)))
  for (const point of numbered()) {
    const count = $$('.step', point).filter(s => said(s.id)).length
    const link = document.querySelector(`[data-toc="${point.id}"]`)
    link?.classList.toggle('done', Boolean(state.read[point.id]))
    const badge = document.querySelector(`[data-badge="${point.id}"]`)
    if (badge) badge.textContent = count ? `${count} 💬` : ''
  }
  nRead.textContent = numbered().filter(p => state.read[p.id]).length
  nPoints.textContent = numbered().length
  const total = META.filter(b => said(b.id)).length + (said('general') ? 1 : 0)
  nSaid.textContent = total
  brief.textContent = total ? `Collect all my feedback (${total})` : 'Collect all my feedback'
}

for (const box of $$('.step .say')) {
  box.value = state.notes[box.dataset.id] || ''
  box.hidden = !box.value
  box.addEventListener('input', () => { state.notes[box.dataset.id] = box.value; save(); paint() })
}
for (const tick of $$('.read input')) {
  tick.checked = Boolean(state.read[tick.dataset.id])
  tick.addEventListener('change', () => { state.read[tick.dataset.id] = tick.checked; save(); paint() })
}

function showTab (n) {
  for (const tab of $$('.tab')) tab.setAttribute('aria-selected', String(tab.dataset.tab === String(n)))
  for (const pane of $$('.pane')) pane.hidden = pane.dataset.tab !== String(n)
}

function show (id) {
  const el = document.getElementById(id)
  const point = el?.closest('.point')
  if (!point) return
  const pane = point.closest('.pane')
  showTab(pane.dataset.tab)
  for (const other of $$('.point', pane)) other.hidden = other !== point
  for (const link of $$('[data-toc]', pane)) link.classList.toggle('here', link.dataset.toc === point.id)
  const points = $$('.point', pane)
  const at = points.indexOf(point)
  const prev = point.querySelector('.prev'); const next = point.querySelector('.next')
  if (prev) prev.disabled = at <= 0
  if (next) next.hidden = at === points.length - 1
  history.replaceState(null, '', '#' + point.id)
  if (el === point) window.scrollTo({ top: 0 })
  else el.scrollIntoView({ block: 'center' })
}

function move (by) {
  const pane = $$('.pane').find(p => !p.hidden)
  const points = $$('.point', pane)
  const at = points.findIndex(p => !p.hidden)
  const to = points[Math.max(0, Math.min(at + by, points.length - 1))]
  if (to) show(to.id)
}

document.addEventListener('click', e => {
  const tab = e.target.closest('.tab')
  if (tab) {
    showTab(tab.dataset.tab)
    const pane = $$('.pane').find(p => !p.hidden)
    const open = $$('.point', pane).find(p => !p.hidden) ?? pane.querySelector('.point')
    show(open.id)
    return
  }

  const jump = e.target.closest('[data-toc], [data-go]')
  if (jump) { e.preventDefault(); show(jump.dataset.toc || jump.dataset.go); return }

  const hop = e.target.closest('[data-step]')
  if (hop) {
    e.preventDefault()
    const point = hop.closest('.pane').querySelector(`.point[data-n="${hop.dataset.step}"]`)
    if (point) show(point.id)
    return
  }

  if (e.target.closest('.next')) { move(1); return }
  if (e.target.closest('.prev')) { move(-1); return }

  const add = e.target.closest('.say-btn')
  if (add) {
    const box = add.parentElement.querySelector('.say')
    box.hidden = !box.hidden && !box.value
    if (!box.hidden) box.focus()
    return
  }

  const unfold = e.target.closest('.unfold')
  if (unfold) { unfold.closest('.code').classList.remove('folded'); unfold.remove(); return }

  const copy = e.target.closest('.copy')
  if (copy) {
    const text = $$('.ln', copy.closest('.code')).map(ln => {
      const clone = ln.cloneNode(true)
      $$('.no, .why, .nb', clone).forEach(n => n.remove())
      return clone.textContent
    }).join('\n')
    navigator.clipboard?.writeText(text)
    copy.textContent = 'Copied'
    setTimeout(() => { copy.textContent = 'Copy' }, 1200)
  }
})

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
  if (e.key === 'j' || e.key === 'ArrowRight') { move(1); e.preventDefault() }
  else if (e.key === 'k' || e.key === 'ArrowLeft') { move(-1); e.preventDefault() }
  else if (e.key === 'r') {
    const tick = $$('.point').find(p => !p.hidden && p.offsetParent)?.querySelector('.read input')
    if (tick) { tick.checked = !tick.checked; tick.dispatchEvent(new Event('change')) }
  }
})

function feedback () {
  const mine = META.filter(b => said(b.id))
  const entry = b => [
    `### ${b.id}, under "${b.point}"`,
    b.label,
    '',
    said(b.id).split('\n').map(l => `> ${l}`).join('\n'),
    '',
  ].join('\n')

  return [
    `# Nick's feedback on the walkthrough of !${IID}`,
    '',
    'Use the skill `nick-walkthrough` to act on this feedback. Its section "Updating a walkthrough" has the steps.',
    '',
    `Source: ${SOURCE}`,
    `Page: ${PAGE}`,
    `Repository: ${REPO_DIR}`,
    `Merge request: ${MR}`,
    '',
    'Each entry below is a passage of the source, which is a `### ` title and everything under it up to the next `### ` or `## ` heading. `t1p3.b2` is the 2nd `### ` passage under the 3rd `## ` heading of the 1st `# ` heading.',
    'Where a comment is a question or describes something unclear, change the source so that the page explains it, then render the page again:',
    '',
    '```sh',
    `cd ${REPO_DIR} && node ${RENDERER} ${SOURCE} ${PAGE}`,
    '```',
    '',
    ...(said('general') ? ['### General', '', said('general').split('\n').map(l => `> ${l}`).join('\n'), ''] : []),
    ...mine.map(entry),
  ].join('\n')
}

general.value = state.notes.general || ''
general.addEventListener('input', () => { state.notes.general = general.value; save(); paint(); outText.value = feedback() })
brief.addEventListener('click', () => { outText.value = feedback(); out.showModal() })
doCopy.addEventListener('click', () => { outText.select(); navigator.clipboard?.writeText(outText.value) })
shut.addEventListener('click', () => out.close())

for (const pane of $$('.pane')) {
  const first = pane.querySelector('.point')
  if (first) for (const other of $$('.point', pane)) other.hidden = other !== first
}
const start = location.hash.slice(1)
addEventListener('load', () => { if (document.getElementById(start)?.classList.contains('point') ?? true) window.scrollTo(0, 0) })
show(document.getElementById(start) ? start : document.querySelector('.point').id)
paint()

// ── notes on the code ──
// "On the lines" shows each note as a badge with a card. "Beside the line (today)" shows each note beside its line.
const MODE = 'nick-walkthrough:notes'
function setMode (m) {
  document.body.classList.toggle('m-ann', m === 'ann')
  document.body.classList.toggle('m-today', m === 'today')
  for (const b of $$('.seg button')) b.setAttribute('aria-pressed', String(b.dataset.m === m))
  try { localStorage.setItem(MODE, m) } catch {}
  if (m === 'today') closeCards()
}
for (const b of $$('.seg button')) b.addEventListener('click', () => setMode(b.dataset.m))

const light = (el, on) => { for (const x of $$(`[data-k="${el.dataset.k}"]`, el.closest('.noted'))) x.classList.toggle('on', on) }
for (const li of $$('.nn li')) {
  li.addEventListener('mouseenter', () => light(li, true))
  li.addEventListener('mouseleave', () => light(li, false))
}

const cardOf = b => b.closest('.code').querySelector(`.pc[data-k="${b.dataset.k}"]`)
const badgeOf = card => card.closest('.code').querySelector(`button.nb[data-k="${card.dataset.k}"]`)
const rowOf = (code, i) => code.querySelector(`.ln[data-i="${i}"]`)
// The tab bar and the timeline of the open point are pinned to the top of the window. A card above a line has to stay below them.
const stuck = () => document.querySelector('.tabbar').offsetHeight + ($$('.line').find(l => l.offsetParent)?.offsetHeight ?? 0)

// A card opens under the last line of its note, or above the first line when there's more room above. That way the card
// is never drawn over the lines of its note.
function place (card) {
  const code = card.closest('.code')
  const box = code.getBoundingClientRect()
  const first = rowOf(code, card.dataset.first).getBoundingClientRect()
  const last = rowOf(code, card.dataset.last).getBoundingClientRect()
  const h = card.offsetHeight
  const below = innerHeight - last.bottom
  const under = below >= h + 12 || below >= first.top - stuck()
  card.classList.toggle('below', under)
  card.classList.toggle('above', !under)
  card.style.top = `${under ? last.bottom - box.top + 8 : first.top - box.top - h - 8}px`
}

let hide
function toggle (badge, on) {
  const keep = on || badge.classList.contains('pin')
  if (keep) for (const other of $$('pre button.nb')) if (other !== badge && cardOf(other).classList.contains('open')) { other.classList.remove('pin'); toggle(other, false) }
  const card = cardOf(badge)
  card.classList.toggle('open', keep)
  if (keep) place(card)
  light(badge, keep)
  const pre = badge.closest('pre')
  pre.classList.toggle('focus', Boolean(pre.querySelector('.ln.on')))
}
function closeCards () { for (const b of $$('pre button.nb')) { b.classList.remove('pin'); toggle(b, false) } }

for (const b of $$('pre button.nb')) {
  b.addEventListener('mouseenter', () => { clearTimeout(hide); toggle(b, true) })
  b.addEventListener('mouseleave', () => { hide = setTimeout(() => toggle(b, false), 250) })
  b.addEventListener('click', () => { b.classList.toggle('pin'); toggle(b, b.classList.contains('pin')) })
}
for (const card of $$('.pc')) {
  card.addEventListener('mouseenter', () => clearTimeout(hide))
  card.addEventListener('mouseleave', () => { hide = setTimeout(() => toggle(badgeOf(card), false), 250) })
}
addEventListener('keydown', e => { if (e.key === 'Escape') closeCards() })
let queued = false
const replace = () => { queued = false; $$('.pc.open').forEach(place) }
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(replace) } }, { passive: true })
addEventListener('resize', replace)

let mode = 'ann'
try { mode = localStorage.getItem(MODE) || 'ann' } catch {}
setMode(mode)
