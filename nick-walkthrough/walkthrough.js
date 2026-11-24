const KEY = 'nick-walkthrough:' + RUN

let state = { notes: {}, read: {}, comments: [] }
try {
  const kept = JSON.parse(localStorage.getItem(KEY) || '{}')
  state = { notes: kept.notes || {}, read: kept.read || {}, toc: kept.toc, comments: kept.comments || [] }
} catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {} }

const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const said = id => (state.notes[id] || '').trim()
const numbered = () => $$('.point[data-n]')

const pointOf = c => document.getElementById(c.at)?.closest('.point')

function paint () {
  for (const step of $$('.step')) step.classList.toggle('said', state.comments.some(c => c.at === step.id))
  for (const point of numbered()) {
    const count = state.comments.filter(c => pointOf(c) === point).length
    const link = document.querySelector(`[data-toc="${point.id}"]`)
    link?.classList.toggle('done', Boolean(state.read[point.id]))
    const badge = document.querySelector(`[data-badge="${point.id}"]`)
    if (badge) badge.textContent = count ? `${count} 💬` : ''
  }
  nRead.textContent = numbered().filter(p => state.read[p.id]).length
  nPoints.textContent = numbered().length
  const total = state.comments.length + (said('general') ? 1 : 0)
  nSaid.textContent = total
  nComments.textContent = state.comments.length
  brief.textContent = total ? `Collect all my feedback (${total})` : 'Collect all my feedback'
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
  const quoted = text => text.split('\n').map(l => `> ${l}`).join('\n')
  const entry = c => [
    `### ${c.at}: ${titleOf(c.at)}`,
    '',
    'The selected text:',
    '',
    quoted(c.quote),
    '',
    "Nick's comment:",
    '',
    quoted(c.text),
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
    'Each entry below is one comment on a piece of text that Nick selected on the page. The heading of an entry is the id of the passage that contains the text, followed by the title of that passage. `t1p3.b2` is the 2nd `### ` passage under the 3rd `## ` heading of the 1st `# ` heading.',
    'Where a comment is a question or describes something unclear, change the source so that the page explains it, then render the page again:',
    '',
    '```sh',
    `cd ${REPO_DIR} && node ${RENDERER} ${SOURCE} ${PAGE}`,
    '```',
    '',
    ...(said('general') ? ['### General', '', quoted(said('general')), ''] : []),
    ...sortedComments().map(entry),
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

// ── comments on selected text ──
// Nick selects any text on the page and clicks Comment. The comment is saved with the id of the passage that contains the
// text and the selected text itself, which is found again on the page after a reload.
const SKIP = '.no, .nb, button, textarea, .pc, .cm-tool, .cm-card'
const wrap = document.querySelector('.wrap')
const order = id => { const el = document.getElementById(id); return el ? $$('.point, .step, .attn').indexOf(el) : -1 }
const sortedComments = () => [...state.comments].sort((a, b) => order(a.at) - order(b.at) || a.made - b.made)

// The place of a comment is the closest element with an id that contains the text, such as a "### " passage.
const placeOf = node => (node.nodeType === 1 ? node : node.parentElement)?.closest('.step[id], .attn[id], .point[id]')
function titleOf (id) {
  const el = document.getElementById(id)
  if (!el) return id
  const point = el.closest('.point')
  const pointTitle = point?.querySelector('.phead h2')?.textContent.trim()
  if (el.classList.contains('step')) return `${META.find(m => m.id === id)?.label ?? id}, under "${pointTitle}"`
  if (el.classList.contains('attn')) return `the warning "${el.querySelector('.attn-t')?.textContent.trim()}", under "${pointTitle}"`
  if (pointTitle) return pointTitle
  const tab = $$('.tab').find(t => t.dataset.tab === el.closest('.pane')?.dataset.tab)
  return `the overview of the tab "${tab?.firstChild.textContent.trim()}"`
}

// Every character that isn't white space, with the text node and the offset it comes from. White space is left out
// because a selection across lines of code has line breaks that the text nodes don't have.
function characters (root) {
  const out = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  })
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (let i = 0; i < n.data.length; i++) if (!/\s/.test(n.data[i])) out.push({ ch: n.data[i], node: n, i })
  }
  return out
}

function highlight (c) {
  const root = document.getElementById(c.at)
  if (!root) return false
  const chars = characters(root)
  const flat = chars.map(x => x.ch).join('')
  const want = c.quote.replace(/\s+/g, '')
  const at = flat.indexOf(want)
  if (!want || at === -1) return false
  const pieces = new Map()
  for (const x of chars.slice(at, at + want.length)) {
    const piece = pieces.get(x.node) ?? { from: x.i, to: x.i }
    piece.to = x.i + 1
    pieces.set(x.node, piece)
  }
  for (const [node, { from, to }] of pieces) {
    const range = document.createRange()
    range.setStart(node, from)
    range.setEnd(node, to)
    const mark = document.createElement('mark')
    mark.className = 'cm-hl'
    mark.dataset.c = c.id
    range.surroundContents(mark)
  }
  return true
}

function unhighlight (id) {
  for (const mark of $$(`mark.cm-hl[data-c="${id}"]`)) {
    const parent = mark.parentNode
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    mark.replaceWith()
    parent.normalize()
  }
}

const tool = document.createElement('div')
tool.className = 'cm-tool'
tool.hidden = true
tool.innerHTML = '<button type="button">💬 Comment</button>'
document.body.append(tool)

const card = document.createElement('div')
card.className = 'cm-card'
card.hidden = true
document.body.append(card)

let picked
function selected () {
  const sel = getSelection()
  if (!sel.rangeCount || sel.isCollapsed) return undefined
  const range = sel.getRangeAt(0)
  const quote = sel.toString().trim()
  const at = placeOf(range.startContainer)
  const inside = node => (node.nodeType === 1 ? node : node.parentElement)?.closest(SKIP)
  if (!quote || !at || !wrap.contains(at) || at.id === 'comments' || at.id === 'files' || inside(range.startContainer)) return undefined
  return { range, quote, at: at.id }
}

function placeAt (el, rect, gap, above = false) {
  el.style.top = `${above ? rect.top + scrollY - el.offsetHeight - gap : rect.bottom + scrollY + gap}px`
  el.style.left = `${Math.max(16, Math.min(rect.left + scrollX, scrollX + innerWidth - el.offsetWidth - 16))}px`
}

function offerComment () {
  picked = selected()
  tool.hidden = !picked
  if (picked) placeAt(tool, picked.range.getBoundingClientRect(), 8, true)
}
let settling
document.addEventListener('selectionchange', () => { clearTimeout(settling); settling = setTimeout(offerComment, 200) })
tool.addEventListener('mousedown', e => e.preventDefault())

const esc = text => text.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
function openCard (c, rect) {
  const old = !state.comments.includes(c)
  card.innerHTML = `
    <div class="cm-head"><span class="cm-av" aria-hidden="true">N</span><b>Nick</b><span class="cm-at">${esc(titleOf(c.at))}</span></div>
    <blockquote class="cm-quote">${esc(c.quote)}</blockquote>
    <textarea class="cm-field" rows="3" placeholder="Write a comment…">${esc(c.text ?? '')}</textarea>
    <div class="cm-acts">${old ? '' : '<button type="button" class="cm-del">Delete</button>'}<span class="spacer"></span><button type="button" class="cm-cancel">Cancel</button><button type="button" class="cm-save primary">${old ? 'Comment' : 'Save'}</button></div>`
  card.hidden = false
  placeAt(card, rect, 8)
  const field = card.querySelector('.cm-field')
  field.focus()
  field.setSelectionRange(field.value.length, field.value.length)
  const close = () => { card.hidden = true; for (const m of $$('mark.cm-hl.on')) m.classList.remove('on') }
  const submit = () => {
    const text = field.value.trim()
    if (!text) { field.focus(); return }
    c.text = text
    if (old) { state.comments.push(c); if (!highlight(c)) c.lost = true }
    save(); paint(); renderList(); close()
  }
  card.querySelector('.cm-save').onclick = submit
  card.querySelector('.cm-cancel').onclick = close
  const del = card.querySelector('.cm-del')
  if (del) del.onclick = () => { remove(c.id); close() }
  field.onkeydown = e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() }
    if (e.key === 'Escape') close()
  }
  for (const m of $$(`mark.cm-hl[data-c="${c.id}"]`)) m.classList.add('on')
}

tool.querySelector('button').addEventListener('click', () => {
  if (!picked) return
  const rect = picked.range.getBoundingClientRect()
  const c = { id: `c${Date.now().toString(36)}`, at: picked.at, quote: picked.quote, made: Date.now() }
  tool.hidden = true
  getSelection().removeAllRanges()
  openCard(c, rect)
})

wrap.addEventListener('click', e => {
  const mark = e.target.closest('mark.cm-hl')
  if (!mark || !getSelection().isCollapsed) return
  const c = state.comments.find(x => x.id === mark.dataset.c)
  if (c) openCard(c, mark.getBoundingClientRect())
})

function remove (id) {
  state.comments = state.comments.filter(c => c.id !== id)
  unhighlight(id)
  save(); paint(); renderList()
}

function jump (c) {
  show(c.at)
  const mark = document.querySelector(`mark.cm-hl[data-c="${c.id}"]`)
  if (!mark) return
  mark.scrollIntoView({ block: 'center' })
  for (const m of $$(`mark.cm-hl[data-c="${c.id}"]`)) m.classList.add('on')
  setTimeout(() => { for (const m of $$(`mark.cm-hl[data-c="${c.id}"]`)) m.classList.remove('on') }, 1600)
}

function renderList () {
  const list = document.getElementById('cmList')
  const all = sortedComments()
  list.innerHTML = all.length ? all.map(c => `
    <li class="cm-item" data-c="${c.id}">
      <a href="#${esc(c.at)}" class="cm-go">${esc(titleOf(c.at))}</a>${c.lost ? ' <span class="dim">(the selected text isn\'t on the page any more)</span>' : ''}
      <blockquote class="cm-quote">${esc(c.quote)}</blockquote>
      <p class="cm-text">${esc(c.text)}</p>
      <div class="cm-acts"><button type="button" class="cm-edit">Edit</button><button type="button" class="cm-del">Delete</button></div>
    </li>`).join('') : '<li class="dim">There aren\'t any comments yet.</li>'
}

document.getElementById('cmList').addEventListener('click', e => {
  const item = e.target.closest('.cm-item')
  const c = item && state.comments.find(x => x.id === item.dataset.c)
  if (!c) return
  if (e.target.closest('.cm-go')) { e.preventDefault(); jump(c); return }
  if (e.target.closest('.cm-del')) { remove(c.id); return }
  if (e.target.closest('.cm-edit')) {
    item.querySelector('.cm-text').outerHTML = `<textarea class="cm-field" rows="3">${esc(c.text)}</textarea>`
    item.querySelector('.cm-acts').innerHTML = '<button type="button" class="cm-cancel">Cancel</button><button type="button" class="cm-save primary">Save</button>'
    const field = item.querySelector('.cm-field')
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
    return
  }
  if (e.target.closest('.cm-save')) {
    const text = item.querySelector('.cm-field').value.trim()
    if (text) { c.text = text; save(); paint() }
    renderList()
    return
  }
  if (e.target.closest('.cm-cancel')) renderList()
})

addEventListener('keydown', e => { if (e.key === 'Escape') { tool.hidden = true; card.hidden = true } })
for (const c of state.comments) c.lost = !highlight(c)
renderList()
paint()
