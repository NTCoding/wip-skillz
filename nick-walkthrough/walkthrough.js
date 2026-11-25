const KEY = 'nick-walkthrough:' + RUN

let state = { notes: {}, read: {}, comments: [], ui: {} }
try {
  const kept = JSON.parse(localStorage.getItem(KEY) || '{}')
  state = { notes: kept.notes || {}, read: kept.read || {}, comments: kept.comments || [], ui: kept.ui || {} }
} catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {} }

const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]
const said = id => (state.notes[id] || '').trim()
const numbered = () => $$('.point[data-n]')
const openPane = () => $$('.pane').find(p => !p.hidden)
const openPoint = () => $$('.point', openPane()).find(p => !p.hidden)
const slideOf = point => Number(point.dataset.cur || 0)

const pointOf = c => document.getElementById(c.at)?.closest('.point')

function paint () {
  for (const mark of $$('[data-say]')) {
    const count = state.comments.filter(c => document.getElementById(c.at)?.closest('.slide')?.id === mark.dataset.say).length
    mark.textContent = count ? `${count} 💬` : ''
  }
  for (const point of numbered()) {
    const count = state.comments.filter(c => pointOf(c) === point).length
    const link = $(`[data-toc="${point.id}"]`)
    link?.classList.toggle('done', Boolean(state.read[point.id]))
    const badge = $(`[data-badge="${point.id}"]`)
    if (badge) badge.textContent = count ? `${count} 💬` : ''
  }
  nRead.textContent = numbered().filter(p => state.read[p.id]).length
  nPoints.textContent = numbered().length
  const total = state.comments.length + (said('general') ? 1 : 0)
  nSaid.textContent = total
  nComments.textContent = state.comments.length
  brief.textContent = total ? `Collect all my feedback (${total})` : 'Collect all my feedback'
  // A count of comments under a point makes the timeline taller.
  measure()
}

for (const tick of $$('.read input')) {
  tick.checked = Boolean(state.read[tick.dataset.id])
  tick.addEventListener('change', () => { state.read[tick.dataset.id] = tick.checked; save(); paint() })
}

// ── the points of a tab ──
// The tab bar and the timeline are pinned to the top of the window. The sidebar and the dropdown start under them.
const stickTop = () => $('.tabbar').offsetHeight + ($('.line', openPane())?.offsetHeight ?? 0)
function measure () {
  const root = document.documentElement.style
  root.setProperty('--tb', `${$('.tabbar').offsetHeight}px`)
  root.setProperty('--st', `${stickTop()}px`)
  root.setProperty('--ft', `${$('footer').offsetHeight}px`)
}

function showTab (n) {
  for (const tab of $$('.tab')) tab.setAttribute('aria-selected', String(tab.dataset.tab === String(n)))
  for (const pane of $$('.pane')) pane.hidden = pane.dataset.tab !== String(n)
}

function reveal (point) {
  const pane = point.closest('.pane')
  showTab(pane.dataset.tab)
  for (const other of $$('.point', pane)) other.hidden = other !== point
  for (const link of $$('[data-toc]', pane)) link.classList.toggle('here', link.dataset.toc === point.id)
  closeDropdown()
  measure()
}

// A point is shown as slides. Slide 0 is the overview of the point and slide n is the passage n.
function go (point, n, scroll) {
  const last = $$('.slide', point).length
  n = Math.max(0, Math.min(last, n))
  point.dataset.cur = n
  closePop()
  for (const s of $$('.slide, .overview-slide', point)) s.classList.toggle('cur', Number(s.dataset.s) === n)
  $('.slide-top', point).hidden = n === 0
  for (const b of $$('[data-to]', point)) {
    if (b.closest('.sfoot')) continue
    b.classList.toggle('cur', Number(b.dataset.to) === n)
    b.classList.toggle('done', Number(b.dataset.to) < n)
  }
  for (const li of $$('.sb-li', point)) li.classList.toggle('cur', Number(li.dataset.li) === n)
  const slide = $(`.slide[data-s="${n}"]`, point)
  const count = $('.scount', point)
  count.innerHTML = slide ? `Passage <b>${n}</b> of ${last}` : `<b>Overview</b> of the ${last} passage${last === 1 ? '' : 's'}`
  $('.sstep[data-d="-1"]', point).disabled = n === 0
  $('.sstep[data-d="1"]', point).disabled = n === last
  const who = slide?.dataset.w
  for (const g of $$('.sq-who', point)) g.classList.toggle('cur', who !== undefined && g.dataset.w === who)
  for (const g of $$('.sq', point)) g.classList.toggle('cur', who !== undefined && (g.dataset.a === who || g.dataset.z === who))
  markDropdown()
  if (point === openPoint()) history.replaceState(null, '', '#' + (slide ? slide.id : point.id))
  layout(point)
  const nav = $('.snav', point)
  if (scroll && nav.getBoundingClientRect().top < stickTop()) scrollTo(0, nav.getBoundingClientRect().top + scrollY - stickTop() - 8)
}

function show (id) {
  const el = document.getElementById(id)
  const point = el?.closest('.point')
  if (!point) return
  reveal(point)
  const slide = el.closest('.slide')
  if (point.classList.contains('slides')) go(point, slide ? Number(slide.dataset.s) : 0)
  else history.replaceState(null, '', '#' + point.id)
  if (el === point || el === slide) window.scrollTo({ top: 0 })
  else el.scrollIntoView({ block: 'center' })
}

function move (by) {
  const points = $$('.point', openPane())
  const at = points.findIndex(p => !p.hidden)
  const to = points[Math.max(0, Math.min(at + by, points.length - 1))]
  if (to && to !== points[at]) show(to.id)
}

// ── the dropdown of the timeline ──
const ddp = document.createElement('div')
ddp.className = 'ddp'
document.body.append(ddp)
let ddFor

function closeDropdown () {
  ddp.classList.remove('open')
  ddFor = undefined
  for (const a of $$('.line a.dd-on')) a.classList.remove('dd-on')
}

function markDropdown () {
  if (!ddFor) return
  const point = document.getElementById(ddFor)
  const open = $(`.slide[data-s="${slideOf(point)}"]`, point)
  for (const li of $$('li[data-go]', ddp)) li.classList.toggle('cur', !point.hidden && open?.id === li.dataset.go)
}

function toggleDropdown (id) {
  const wasOpen = ddFor === id
  closeDropdown()
  const template = $(`template[data-dd="${id}"]`)
  if (wasOpen || !template) return
  ddFor = id
  $(`.line a[data-toc="${id}"]`)?.classList.add('dd-on')
  ddp.innerHTML = template.innerHTML
  ddp.style.top = `${stickTop() - 1}px`
  ddp.classList.add('open')
  markDropdown()
}

// ── the folds and the diagrams ──
function setSidebar (on) {
  document.body.classList.toggle('sb-off', !on)
  for (const b of $$('.sb-col')) { b.setAttribute('aria-label', on ? 'Hide the passages' : 'Show the passages'); b.title = b.getAttribute('aria-label') }
  state.ui.sidebar = on
  save(); layout()
}

function setText (on) {
  document.body.classList.toggle('text-off', !on)
  closePop()
  for (const b of $$('.tcol')) { b.setAttribute('aria-label', on ? 'Hide the text' : 'Show the text'); b.title = b.getAttribute('aria-label') }
  state.ui.text = on
  save(); layout()
}

// The view and the fold of "The request" are the same on every slide of every point.
function setView (view) {
  for (const d of $$('.dsw')) d.dataset.v = view
  state.ui.view = view
  save(); layout()
}

function setFold (closed) {
  for (const d of $$('.dsw.fold')) {
    d.classList.toggle('closed', closed)
    const b = $('.dsw-fold', d)
    b.setAttribute('aria-label', closed ? 'Show the diagram' : 'Hide the diagram'); b.title = b.getAttribute('aria-label')
  }
  state.ui.fold = closed
  save(); layout()
}

// The arrows of a card diagram join the cards in the order of the passages. They are drawn from the places of the cards,
// which depend on how the titles wrap.
function drawFlows () {
  for (const f of $$('.fl')) {
    if (!f.offsetParent) continue
    const boxes = $$('.fl-box', f).sort((a, b) => a.dataset.i - b.dataset.i)
    let out = ''
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i]; const c = boxes[i + 1]
      const x1 = a.offsetLeft + a.offsetWidth + 2; const y1 = a.offsetTop + a.offsetHeight / 2
      const x2 = c.offsetLeft - 8; const y2 = c.offsetTop + c.offsetHeight / 2
      const d = Math.abs(y1 - y2) < 4 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${(x1 + x2) / 2}V${y2}H${x2}`
      out += `<path d="${d}" fill="none" stroke="#64748b" stroke-width="1.5"/><polygon fill="#64748b" points="${x2 + 8},${y2} ${x2},${y2 - 4.5} ${x2},${y2 + 4.5}"/>`
    }
    $('.fl-svg', f).innerHTML = out
  }
}

// A diagram that is wider than its space is never squeezed into that space. A diagram that is a little too wide is scaled
// down as a whole, to 80% at the least. A wider diagram is drawn at its full size. The reader then zooms and pans the diagram.
const SMALLEST_FIT = 0.8
class Zoom {
  constructor (el) {
    this.el = el; this.view = $('.zp-view', el); this.inner = $('.zp-in', el); this.tools = $('.zp-tools', el); this.label = $('.zp-pc', el)
    this.s = 1; this.x = 0; this.y = 0; this.auto = true
    this.view.addEventListener('pointerdown', e => this.grab(e))
    this.view.addEventListener('click', e => { if (this.dragged) { e.stopPropagation(); e.preventDefault(); this.dragged = false } }, true)
    this.view.addEventListener('wheel', e => this.wheel(e), { passive: false })
    this.tools.addEventListener('click', e => this.press(e.target.closest('[data-zp]')?.dataset.zp))
  }

  refresh () {
    if (!this.view.offsetParent) return
    const w = this.inner.scrollWidth; const h = this.inner.offsetHeight; const vw = this.view.clientWidth
    this.wide = w > vw + 1
    if (this.auto) this.s = this.wide && vw / w >= SMALLEST_FIT ? vw / w : 1
    const active = this.wide || this.s !== 1
    this.el.classList.toggle('over', active)
    this.tools.hidden = !active
    if (!active) { this.x = 0; this.y = 0; this.inner.style.transform = ''; this.view.style.height = ''; return }
    const vh = Math.min(h * this.s, Math.max(260, innerHeight * 0.7))
    this.x = Math.min(0, Math.max(vw - w * this.s, this.x))
    this.y = Math.min(0, Math.max(vh - h * this.s, this.y))
    this.inner.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.s})`
    this.view.style.height = `${vh}px`
    this.label.textContent = `${Math.round(this.s * 100)}%`
  }

  zoom (s, cx = this.view.clientWidth / 2, cy = 0) {
    s = Math.max(0.3, Math.min(2.5, s))
    this.auto = false
    this.x = cx - (cx - this.x) * s / this.s
    this.y = cy - (cy - this.y) * s / this.s
    this.s = s
    this.refresh()
  }

  press (action) {
    if (action === 'in') this.zoom(this.s * 1.25)
    else if (action === 'out') this.zoom(this.s / 1.25)
    else if (action === 'reset') this.zoom(1)
    else if (action === 'fit') { this.auto = false; this.x = 0; this.y = 0; this.s = Math.min(1, this.view.clientWidth / this.inner.scrollWidth); this.refresh() }
  }

  // The open passage is always in view, whatever the reader panned to before.
  bring (el) {
    if (!el || !this.view.offsetParent) return
    this.refresh()
    if (!this.wide && this.s === 1) return
    const left = el.offsetLeft * this.s; const right = left + el.offsetWidth * this.s; const vw = this.view.clientWidth
    if (left + this.x < 16) this.x = 16 - left
    else if (right + this.x > vw - 16) this.x = vw - 16 - right
    this.refresh()
  }

  grab (e) {
    if (e.button !== 0 || !this.el.classList.contains('over')) return
    const from = { px: e.clientX, py: e.clientY, x: this.x, y: this.y }
    const drag = m => {
      if (!this.dragged && Math.hypot(m.clientX - from.px, m.clientY - from.py) < 5) return
      this.dragged = true
      this.el.classList.add('drag')
      this.x = from.x + m.clientX - from.px; this.y = from.y + m.clientY - from.py
      this.refresh()
    }
    const drop = () => {
      removeEventListener('pointermove', drag); removeEventListener('pointerup', drop)
      this.el.classList.remove('drag')
      // A click follows a drag only when the pointer is still over the diagram. So the mark of the drag is cleared after
      // that click.
      setTimeout(() => { this.dragged = false }, 0)
    }
    addEventListener('pointermove', drag); addEventListener('pointerup', drop)
  }

  wheel (e) {
    const box = this.view.getBoundingClientRect()
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      this.zoom(this.s * Math.exp(-e.deltaY / 300), e.clientX - box.left, e.clientY - box.top)
    } else if (this.el.classList.contains('over') && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault()
      this.x -= e.deltaX
      this.refresh()
    }
  }
}
const zooms = $$('.zp').map(el => new Zoom(el))

let framed = false
function layout (point = openPoint()) {
  if (point) for (const z of zooms) if (point.contains(z.el)) z.bring($('.fl-box.cur', z.el))
  if (framed) return
  framed = true
  requestAnimationFrame(() => { framed = false; for (const z of zooms) z.refresh(); drawFlows() })
}

// ── notes on the code ──
// A note is a badge on the code and a row in the notes panel of the text. Both have the number of the note. Both are lit
// together.
const rowOf = (g, k) => $(`.ghp-row[data-g="${g}"][data-k="${k}"]`)
const pinned = (g, k) => Boolean(rowOf(g, k)?.classList.contains('pin')) || (pop?.pin && pop.g === g && pop.k === k)
function light (g, k, on) {
  for (const x of $$(`[data-g="${g}"][data-k="${k}"], [data-g="${g}"] [data-k="${k}"]`)) x.classList.toggle('on', on)
  const pre = $(`.code[data-g="${g}"] pre`)
  pre?.classList.toggle('focus', Boolean(pre.querySelector('.ln.on')))
}

function openRow (row, open) {
  row.classList.toggle('open', open)
  row.classList.toggle('pin', open)
  light(row.dataset.g, row.dataset.k, open)
}

function toggleRow (row) {
  const was = row.classList.contains('open')
  if (!was) row.closest('.ghp').classList.remove('collapsed')
  openRow(row, !was)
}

function hoverable (sel, gOf) {
  for (const el of $$(sel)) {
    el.addEventListener('mouseenter', () => light(gOf(el), el.dataset.k, true))
    el.addEventListener('mouseleave', () => { if (!pinned(gOf(el), el.dataset.k)) light(gOf(el), el.dataset.k, false) })
  }
}
hoverable('pre .ln.mk', el => el.closest('.code').dataset.g)
hoverable('.ghp-row', el => el.dataset.g)

// While the text is folded, a badge opens its note in a card under the last line of the note, or above the first line
// when there's more room above. That way the card is never drawn over the lines of the note.
let pop; let popTimer
function closePop () {
  clearTimeout(popTimer)
  if (!pop) return
  const { el, g, k } = pop
  el.remove()
  pop = undefined
  if (!pinned(g, k)) light(g, k, false)
}

function showPop (badge, pin) {
  clearTimeout(popTimer)
  const code = badge.closest('.code'); const g = code.dataset.g; const k = badge.dataset.k
  if (pop && pop.g === g && pop.k === k) { pop.pin = pop.pin || pin; return }
  closePop()
  const row = rowOf(g, k)
  if (!row) return
  const el = document.createElement('div')
  el.className = 'pop'
  if (code.dataset.ctx) el.dataset.ctx = code.dataset.ctx
  el.innerHTML = `<div class="pop-h"><span class="ghp-n">${k}</span><span class="pop-t"></span><span class="pop-at"></span></div><div class="pop-x">${$('.ghp-exp', row).innerHTML}</div>`
  $('.pop-t', el).textContent = $('.ghp-name', row).textContent
  $('.pop-at', el).textContent = $('.ghp-at', row).textContent
  code.append(el)
  pop = { el, g, k, pin }
  light(g, k, true)
  const lines = $$(`.ln.mk[data-k="${k}"]`, code)
  const box = code.getBoundingClientRect(); const first = lines[0].getBoundingClientRect(); const last = lines.at(-1).getBoundingClientRect()
  const h = el.offsetHeight; const below = innerHeight - $('footer').offsetHeight - last.bottom; const above = first.top - stickTop()
  const under = below >= h + 16 || below >= above
  el.classList.add(under ? 'below' : 'above')
  el.style.top = `${under ? last.bottom - box.top + 8 : first.top - box.top - h - 8}px`
  el.addEventListener('mouseenter', () => clearTimeout(popTimer))
  el.addEventListener('mouseleave', () => { if (!pop?.pin) popTimer = setTimeout(closePop, 250) })
}

for (const badge of $$('pre button.nb')) {
  badge.addEventListener('mouseenter', () => { if (document.body.classList.contains('text-off')) showPop(badge, false) })
  badge.addEventListener('mouseleave', () => { if (pop && !pop.pin) popTimer = setTimeout(closePop, 250) })
}

// ── clicks and keys ──
document.addEventListener('click', e => {
  const tab = e.target.closest('.tab')
  if (tab) {
    showTab(tab.dataset.tab)
    const pane = openPane()
    const point = $$('.point', pane).find(p => !p.hidden) ?? $('.point', pane)
    reveal(point)
    history.replaceState(null, '', '#' + ($('.slide.cur', point)?.id ?? point.id))
    layout(point)
    return
  }

  if (e.target.closest('.ddp-x')) { closeDropdown(); return }

  const toc = e.target.closest('[data-toc]')
  if (toc) {
    e.preventDefault()
    if (toc.classList.contains('ov')) show(toc.dataset.toc)
    else toggleDropdown(toc.dataset.toc)
    return
  }

  const jump = e.target.closest('[data-go]')
  if (jump) { e.preventDefault(); show(jump.dataset.go); return }
  if (ddFor && !e.target.closest('.ddp')) closeDropdown()

  const hop = e.target.closest('[data-step]')
  if (hop) {
    e.preventDefault()
    const point = $(`.point[data-n="${hop.dataset.step}"]`, hop.closest('.pane'))
    if (point) show(point.id)
    return
  }

  const file = e.target.closest('.sb-file')
  if (file) {
    const point = file.closest('.point')
    go(point, Number(file.closest('.sb-li').dataset.li))
    const code = $(`.slide.cur .code[data-g="${file.dataset.file}"]`, point)
    if (code) scrollTo(0, code.getBoundingClientRect().top + scrollY - stickTop() - 16)
    return
  }

  const to = e.target.closest('[data-to]')
  if (to) { go(to.closest('.point'), Number(to.dataset.to), true); return }
  const step = e.target.closest('.sstep')
  if (step) { const point = step.closest('.point'); go(point, slideOf(point) + Number(step.dataset.d), true); return }

  if (e.target.closest('.sb-col')) { setSidebar(document.body.classList.contains('sb-off')); return }
  if (e.target.closest('.tcol')) { setText(document.body.classList.contains('text-off')); return }
  const view = e.target.closest('.dtab')
  if (view) { setView(view.dataset.v); return }
  const fold = e.target.closest('.dsw-fold')
  if (fold) { setFold(!fold.closest('.dsw').classList.contains('closed')); return }

  const all = e.target.closest('.ghp-all')
  if (all) {
    for (const row of $$('.ghp-row')) row.classList.toggle('open', all.dataset.open === 'true')
    return
  }
  const head = e.target.closest('.ghp-h')
  if (head) { head.closest('.ghp').classList.toggle('collapsed'); return }
  const line = e.target.closest('.ghp-line')
  if (line) { toggleRow(line.closest('.ghp-row')); return }
  const badge = e.target.closest('pre button.nb')
  if (badge) {
    if (!document.body.classList.contains('text-off')) { toggleRow(rowOf(badge.closest('.code').dataset.g, badge.dataset.k)); return }
    const same = pop && pop.pin && pop.k === badge.dataset.k && pop.g === badge.closest('.code').dataset.g
    closePop()
    if (!same) showPop(badge, true)
    return
  }
  if (pop?.pin && !e.target.closest('.pop')) closePop()

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
  if (e.key === 'Escape') { closeDropdown(); closePop(); return }
  if (e.metaKey || e.ctrlKey || e.altKey || out.open || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
  const point = openPoint()
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    if (!point?.classList.contains('slides')) return
    go(point, slideOf(point) + (e.key === 'ArrowRight' ? 1 : -1), true)
    e.preventDefault()
  } else if (e.key === 'j') { move(1); e.preventDefault() } else if (e.key === 'k') { move(-1); e.preventDefault() } else if (e.key === 'r') {
    const tick = $('.read input', point)
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

// ── comments on selected text ──
// Nick selects any text on the page and clicks Comment. The comment is saved with the id of the passage that contains the
// text and the selected text itself, which is found again on the page after a reload.
const SKIP = '.no, .nb, button, textarea, .pop, .cm-tool, .cm-card, .sb, .snav, .sfoot, .zp-tools'
const wrap = $('.wrap')
const order = id => { const el = document.getElementById(id); return el ? $$('.point, .step, .attn').indexOf(el) : -1 }
const sortedComments = () => [...state.comments].sort((a, b) => order(a.at) - order(b.at) || a.made - b.made)

// The place of a comment is the closest element with an id that contains the text, such as a "### " passage.
const placeOf = node => (node.nodeType === 1 ? node : node.parentElement)?.closest('.attn[id], .step[id], .point[id]')
function titleOf (id) {
  const el = document.getElementById(id)
  if (!el) return id
  const point = el.closest('.point')
  const pointTitle = $('.phead h2', point)?.textContent.trim()
  if (el.classList.contains('step')) return `${META.find(m => m.id === id)?.label ?? id}, under "${pointTitle}"`
  if (el.classList.contains('attn')) return `the warning "${$('.attn-t', el)?.textContent.trim()}", under "${pointTitle}"`
  if (pointTitle) return pointTitle
  const tab = $$('.tab').find(t => t.dataset.tab === el.closest('.pane')?.dataset.tab)
  return `the overview of the tab "${tab?.firstChild.textContent.trim()}"`
}

// Every character that isn't white space, with the text node and the offset it comes from. White space is left out
// because a selection across lines of code has line breaks that the text nodes don't have.
function characters (root) {
  const found = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  })
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (let i = 0; i < n.data.length; i++) if (!/\s/.test(n.data[i])) found.push({ ch: n.data[i], node: n, i })
  }
  return found
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
  const field = $('.cm-field', card)
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
  $('.cm-save', card).onclick = submit
  $('.cm-cancel', card).onclick = close
  const del = $('.cm-del', card)
  if (del) del.onclick = () => { remove(c.id); close() }
  field.onkeydown = e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() }
    if (e.key === 'Escape') close()
  }
  for (const m of $$(`mark.cm-hl[data-c="${c.id}"]`)) m.classList.add('on')
}

$('button', tool).addEventListener('click', () => {
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

// A comment can be on text that is folded away, such as a note that isn't open. The page opens that text first.
function jump (c) {
  show(c.at)
  const mark = $(`mark.cm-hl[data-c="${c.id}"]`)
  if (!mark) return
  if (mark.closest('.r-text') && document.body.classList.contains('text-off')) setText(true)
  const row = mark.closest('.ghp-row')
  if (row && !row.classList.contains('open')) toggleRow(row)
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
    $('.cm-text', item).outerHTML = `<textarea class="cm-field" rows="3">${esc(c.text)}</textarea>`
    $('.cm-acts', item).innerHTML = '<button type="button" class="cm-cancel">Cancel</button><button type="button" class="cm-save primary">Save</button>'
    const field = $('.cm-field', item)
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
    return
  }
  if (e.target.closest('.cm-save')) {
    const text = $('.cm-field', item).value.trim()
    if (text) { c.text = text; save(); paint() }
    renderList()
    return
  }
  if (e.target.closest('.cm-cancel')) renderList()
})

addEventListener('keydown', e => { if (e.key === 'Escape') { tool.hidden = true; card.hidden = true } })

// ── start ──
const start = location.hash.slice(1)
for (const pane of $$('.pane')) {
  const first = $('.point', pane)
  if (first) for (const other of $$('.point', pane)) other.hidden = other !== first
}
for (const point of $$('.point.slides')) go(point, 0)
if (state.ui.sidebar === false) setSidebar(false)
if (state.ui.text === false) setText(false)
if (state.ui.view) setView(state.ui.view)
if (state.ui.fold === false) setFold(false)
for (const c of state.comments) c.lost = !highlight(c)
renderList()

show(document.getElementById(start) ? start : $('.point').id)
paint()
// After the page has loaded, the browser scrolls to the element of the hash. That scroll hides the title of the point so
// the page scrolls back to the top.
addEventListener('load', () => { measure(); layout(openPoint()); if (!document.getElementById(start)?.classList.contains('attn')) scrollTo(0, 0) })
addEventListener('resize', () => { measure(); closePop(); layout(openPoint()) })

// The renderer opens the page with "?check" to find each block that runs past the right edge of its column. The result is
// in the page.
if (new URLSearchParams(location.search).has('check')) {
  const tooWide = new Set()
  for (const point of $$('.point.slides')) {
    reveal(point)
    for (const slide of $$('.slide, .overview-slide', point)) {
      go(point, Number(slide.dataset.s))
      const columns = slide.classList.contains('overview-slide') ? [slide] : $$('.r-code, .r-text', slide)
      for (const column of columns) {
        const edge = column.getBoundingClientRect().right
        for (const el of $$('table, pre, img, svg', column)) {
          if (el.closest('.zp')) continue
          const over = Math.round(el.getBoundingClientRect().right - edge)
          if (over > 1) tooWide.add(`${titleOf(slide.id || point.id)}${slide.id ? '' : ', overview'}: a ${el.tagName.toLowerCase()} runs ${over} pixels past the right edge`)
        }
      }
    }
  }
  const result = document.createElement('pre')
  result.id = 'layout-check'
  result.textContent = JSON.stringify([...tooWide])
  document.body.append(result)
}
