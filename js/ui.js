// Small DOM helpers shared by all views.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k.startsWith('--')) el.style.setProperty(k, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function topbar(title, { back, right } = {}) {
  return h('header', { class: 'topbar' },
    back ? h('button', { class: 'icon-btn', 'aria-label': 'Wstecz', onclick: () => (back === true ? history.back() : (location.hash = back)) }, '←') : null,
    h('h1', {}, title),
    right || null,
  );
}

export function toast(text) {
  const box = document.getElementById('toasts');
  const t = h('div', { class: 'toast' }, text);
  box.append(t);
  setTimeout(() => t.remove(), 3000);
}

export function modal({ emoji, title, text, buttons = [{ label: 'Super!', primary: true }] }) {
  return new Promise((resolve) => {
    const back = h('div', { class: 'modal-back' });
    const close = (v) => { back.remove(); resolve(v); };
    back.append(h('div', { class: 'modal', role: 'dialog' },
      emoji ? h('div', { class: 'm-emoji' }, emoji) : null,
      h('h2', {}, title),
      text ? h('p', {}, text) : null,
      h('div', { class: 'stack' }, buttons.map((b) =>
        h('button', { class: `btn block ${b.primary ? '' : 'ghost'} ${b.cls || ''}`, onclick: () => close(b.value ?? true) }, b.label))),
    ));
    document.body.append(back);
  });
}

export function confirmDialog(title, text, okLabel = 'Tak') {
  return modal({ title, text, buttons: [{ label: okLabel, primary: true, value: true, cls: 'bad' }, { label: 'Anuluj', value: false }] });
}

export function confetti(count = 80) {
  const colors = ['#FF7A59', '#FFC857', '#5BC0BE', '#B79CED', '#22A86B', '#FF4F81', '#6EC6FF'];
  const box = h('div', { class: 'confetti' });
  for (let i = 0; i < count; i++) {
    box.append(h('i', {
      style: {
        left: `${Math.random() * 100}%`,
        background: colors[i % colors.length],
        animationDuration: `${1.6 + Math.random() * 1.6}s`,
        animationDelay: `${Math.random() * 0.4}s`,
        transform: `rotate(${Math.random() * 360}deg)`,
      },
    }));
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3800);
}

export function ring(pct, color, size = 48, label) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.innerHTML = `
    <circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}"></circle>
    <circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, pct)))}"></circle>
    <text x="50%" y="50%">${label ?? Math.round(pct * 100) + '%'}</text>`;
  return svg;
}

export function progressBar(pct, cls = '') {
  return h('div', { class: `progress ${cls}` }, h('i', { style: { width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%` } }));
}

export function stars(n, max = 3) {
  return '★'.repeat(n) + '☆'.repeat(max - n);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

export function vibrate(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

export function plural(n, one, few, many) {
  if (n === 1) return one;
  const d = n % 10, dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
}

/** replaceChildren that skips null/false (like h()). */
export function setChildren(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}
