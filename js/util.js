// Small DOM and string helpers.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Marks a string as already-safe HTML so `html` won't escape it. */
export function raw(str) {
  return { __html: String(str) };
}

/** Tagged template that escapes interpolations unless wrapped in raw() or arrays of raw(). */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += toHtml(values[i]);
  });
  return raw(out);
}

function toHtml(v) {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(toHtml).join('');
  if (typeof v === 'object' && '__html' in v) return v.__html;
  return esc(v);
}

export function render(el, content) {
  el.innerHTML = toHtml(content);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Only allow http(s) URLs into href/src attributes. */
export function safeUrl(url) {
  return /^https?:\/\//i.test(url || '') ? url : '';
}

/** Only allow inline image data URLs (owner photos). */
export function safeDataImage(src) {
  return /^data:image\/(webp|jpeg|png);base64,/i.test(src || '') ? src : '';
}

export function toList(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function formatDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function fold(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Deterministic daily index so "perfume of the day" is stable for 24h. */
export function dailyIndex(length, date = new Date()) {
  if (!length) return -1;
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.abs(h) % length;
}

let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
