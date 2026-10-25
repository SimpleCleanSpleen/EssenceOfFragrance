// Share images: draws a perfume or combo (with all its journal info) onto a canvas
// as a PNG, in a colour palette you can pick, tweak with sliders or hex codes, and save.

import { STATUS_BY_ID } from './constants.js';
import { html, raw, render, $, $$, debounce, formatDate, safeDataImage, safeUrl, toast } from './util.js';
import { PLACEHOLDER } from './images.js';
import { noteEmoji } from './notes.js';
import { collageRects } from './combos.js';
import { LONGEVITY, SILLAGE } from './constants.js';

/* ------------------------------------------------------------ palettes */

export const ROLES = [
  ['bg1', 'Background top'],
  ['bg2', 'Background bottom'],
  ['card', 'Cards'],
  ['text', 'Text'],
  ['accent', 'Accent'],
];

export const PRESETS = [
  { id: 'bubblegum', name: 'Bubblegum', colors: { bg1: '#FFE3EF', bg2: '#E9DEFF', card: '#FFFFFF', text: '#4A2560', accent: '#E0408A' } },
  { id: 'cotton-candy', name: 'Cotton Candy', colors: { bg1: '#FFD1E6', bg2: '#BFE3FF', card: '#FFFFFF', text: '#4A2560', accent: '#FF5FA2' } },
  { id: 'lavender', name: 'Lavender Dream', colors: { bg1: '#F1EAFF', bg2: '#D6C6FF', card: '#FFFFFF', text: '#3D1E52', accent: '#8E44C9' } },
  { id: 'baby-blue', name: 'Baby Blue', colors: { bg1: '#EAF6FF', bg2: '#C4E3FF', card: '#FFFFFF', text: '#1F3B63', accent: '#3B82C4' } },
  { id: 'peach', name: 'Peach Sorbet', colors: { bg1: '#FFF0E6', bg2: '#FFD3E2', card: '#FFFFFF', text: '#5A2A3A', accent: '#F0627E' } },
  { id: 'midnight', name: 'Midnight Glam', colors: { bg1: '#2A1440', bg2: '#4A1F5E', card: '#3A1C50', text: '#FFE9F5', accent: '#FF7EB6' } },
];

const LAST_KEY = 'perfume-journal-share-palette';
const LOCAL_KEY = 'perfume-journal-palettes';

export function localPalettes() {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export function saveLocalPalettes(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------ colour maths */

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normHex(v) {
  const m = HEX.exec(String(v || '').trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return `#${h.toUpperCase()}`;
}
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]) {
  return `#${[r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
export function hexToHsl(hex) {
  const [r, g, b] = rgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}
function mix(a, b, t) {
  const x = rgb(a);
  const y = rgb(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}
function alpha(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ------------------------------------------------------------ image loading */

const imageCache = new Map();

/** Fragrantica doesn't allow canvas use of its images, so they go through a CORS-friendly proxy. */
function shareableSrc(p) {
  const photo = safeDataImage(p.photo);
  if (photo) return photo;
  const url = safeUrl(p.imageUrl);
  return url ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800` : PLACEHOLDER;
}

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 10000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  }).then(async (img) => img || (src === PLACEHOLDER ? null : loadImage(PLACEHOLDER)));
  imageCache.set(src, promise);
  return promise;
}

/* ------------------------------------------------------------ canvas helpers */

const W = 1080;
const PAD = 64;
const INNER = W - PAD * 2;
const FONT = {
  script: (s) => `${s}px Pacifico, cursive`,
  ui: (s, w = 600) => `${w} ${s}px Fredoka, Quicksand, sans-serif`,
  body: (s, w = 500) => `${w} ${s}px Quicksand, sans-serif`,
};

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxW, maxLines = Infinity) {
  const lines = [];
  for (const para of String(text).split(/\n+/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
    cut[maxLines - 1] = `${last.trimEnd()}…`;
    return cut;
  }
  return lines;
}

function drawImageFit(ctx, img, x, y, w, h, mode) {
  if (!img) return;
  const r = mode === 'cover' ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height);
  const dw = img.width * r;
  const dh = img.height * r;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

const fitFor = (p) => (safeDataImage(p.photo) ? 'cover' : 'contain');

/** A drawing session: content is drawn first, then panels and the background slide in behind it. */
class Painter {
  constructor(colors) {
    this.c = colors;
    this.muted = mix(colors.text, colors.card, 0.3);
    this.soft = mix(colors.accent, colors.card, 0.86);
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = 7000;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.textBaseline = 'alphabetic';
  }

  text(str, x, y, font, color, align = 'left') {
    const { ctx } = this;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
  }

  /** Draws wrapped text and returns the y below it. */
  para(str, x, y, w, size, color, { lineH = size * 1.5, maxLines, align = 'left', font } = {}) {
    const { ctx } = this;
    ctx.font = font || FONT.body(size);
    const lines = wrap(ctx, str, w, maxLines);
    const ax = align === 'center' ? x + w / 2 : x;
    lines.forEach((ln, i) => this.text(ln, ax, y + size + i * lineH, ctx.font, color, align));
    return y + size + (lines.length - 1) * lineH + size * 0.45;
  }

  /** A panel behind content drawn between y0 and y1. */
  panel(y0, y1) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.shadowColor = alpha(this.c.text, 0.12);
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = this.c.card;
    roundRect(ctx, PAD, y0, INNER, y1 - y0, 36);
    ctx.fill();
    ctx.restore();
  }

  /** Section in a card: heading + body(y) => y. Returns y after the card. */
  section(y, icon, title, body) {
    const top = y;
    let cy = y + 40;
    this.text(`${icon}  ${title}`, PAD + 40, cy + 34, FONT.ui(36), this.c.accent);
    cy = body(cy + 64);
    const bottom = cy + 36;
    this.panel(top, bottom);
    return bottom + 28;
  }

  chips(items, x, y, w, { size = 30, fill = this.soft } = {}) {
    const { ctx } = this;
    const h = size * 1.75;
    const gap = 12;
    ctx.font = FONT.body(size, 600);
    let cx = x;
    let cy = y;
    for (const label of items) {
      const tw = Math.min(ctx.measureText(label).width, w - size * 1.4);
      const cw = tw + size * 1.4;
      if (cx + cw > x + w && cx > x) {
        cx = x;
        cy += h + gap;
      }
      ctx.fillStyle = fill;
      roundRect(ctx, cx, cy, cw, h, h / 2);
      ctx.fill();
      this.text(label, cx + size * 0.7, cy + h * 0.66, FONT.body(size, 600), this.c.text);
      cx += cw + gap;
    }
    return cy + h;
  }

  hearts(rating, cx, y, size, align = 'center') {
    const r = Math.round(rating || 0);
    const step = size * 1.15;
    const start = align === 'center' ? cx - (step * 5) / 2 + step / 2 : cx + size / 2;
    for (let i = 0; i < 5; i++) {
      this.text('♥', start + i * step, y, `${size}px Quicksand, sans-serif`, i < r ? this.c.accent : alpha(this.c.text, 0.15), 'center');
    }
  }

  meter(label, value, scale, x, y, w) {
    const i = scale.indexOf(value);
    if (i < 0) return y;
    this.text(label, x, y + 30, FONT.body(30, 600), this.muted);
    this.text(value, x + w, y + 30, FONT.body(30, 700), this.c.text, 'right');
    const seg = (w - (scale.length - 1) * 8) / scale.length;
    scale.forEach((_, j) => {
      this.ctx.fillStyle = j <= i ? this.c.accent : alpha(this.c.text, 0.1);
      roundRect(this.ctx, x + j * (seg + 8), y + 50, seg, 16, 8);
      this.ctx.fill();
    });
    return y + 90;
  }

  header(y) {
    this.text('✿ Essence of Fragrance ✿', W / 2, y + 44, FONT.script(40), this.c.accent, 'center');
    return y + 80;
  }

  footer(y) {
    const url = `${location.host}${location.pathname}`.replace(/\/$/, '');
    this.text('from my perfume journal ♡', W / 2, y + 40, FONT.ui(30, 500), this.muted, 'center');
    this.text(url, W / 2, y + 84, FONT.body(26, 600), this.muted, 'center');
    return y + 124;
  }

  /** Crop to the content, paint the background behind everything, export. */
  async finish(height) {
    const out = document.createElement('canvas');
    out.width = W;
    out.height = Math.ceil(height);
    const ctx = out.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, W * 0.3, out.height);
    g.addColorStop(0, this.c.bg1);
    g.addColorStop(1, this.c.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, out.height);
    // Sparkles in the corners.
    ctx.font = '48px Quicksand, sans-serif';
    ctx.fillStyle = alpha(this.c.accent, 0.35);
    ctx.textAlign = 'center';
    [[70, 90], [W - 80, 150], [W - 120, out.height - 160], [90, out.height - 110]].forEach(([x, y], i) => ctx.fillText(i % 2 ? '✧' : '✦', x, y));
    ctx.drawImage(this.canvas, 0, 0);
    return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
  }
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load('40px Pacifico'),
    document.fonts.load('600 30px Fredoka'),
    document.fonts.load('500 30px Quicksand'),
    document.fonts.load('700 30px Quicksand'),
  ]).catch(() => {});
}

/* ------------------------------------------------------------ layouts */

async function drawPolaroid(pt, y, w, h, drawInside) {
  const { ctx } = pt;
  const x = (W - w) / 2;
  ctx.save();
  ctx.translate(W / 2, y + h / 2);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.translate(-W / 2, -(y + h / 2));
  ctx.shadowColor = alpha(pt.c.text, 0.2);
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = pt.c.card;
  ctx.fillRect(x, y, w, h);
  ctx.shadowColor = 'transparent';
  await drawInside(x + 24, y + 24, w - 48, h - 90);
  // washi tape
  ctx.fillStyle = alpha(pt.c.accent, 0.45);
  ctx.fillRect(W / 2 - 80, y - 20, 160, 44);
  ctx.restore();
  return y + h + 50;
}

export async function renderPerfume(p, colors) {
  await ensureFonts();
  const pt = new Painter(colors);
  const img = await loadImage(shareableSrc(p));
  let y = pt.header(PAD - 20);

  y = await drawPolaroid(pt, y + 20, 600, 780, async (x, iy, w, h) => {
    pt.ctx.fillStyle = mix(colors.bg1, colors.card, 0.5);
    pt.ctx.fillRect(x, iy, w, h);
    drawImageFit(pt.ctx, img, x, iy, w, h, fitFor(p));
  });

  const s = STATUS_BY_ID[p.status] || STATUS_BY_ID.have;
  pt.ctx.font = FONT.ui(30);
  const badge = `${s.icon} ${s.badge}`;
  const bw = pt.ctx.measureText(badge).width + 56;
  pt.ctx.fillStyle = pt.soft;
  roundRect(pt.ctx, (W - bw) / 2, y, bw, 56, 28);
  pt.ctx.fill();
  pt.text(badge, W / 2, y + 39, FONT.ui(30), colors.text, 'center');
  y += 70;

  y = pt.para(p.name, PAD, y, INNER, 76, colors.text, { font: FONT.script(76), lineH: 112, maxLines: 3, align: 'center' });
  y = pt.para(p.brand, PAD, y, INNER, 42, pt.muted, { font: FONT.ui(42, 500), maxLines: 2, align: 'center' });
  if (p.rating) {
    pt.hearts(p.rating, W / 2, y + 70, 56);
    y += 100;
  }
  y += 30;

  const bodyX = PAD + 40;
  const bodyW = INNER - 80;
  if (p.review) y = pt.section(y, '📖', 'My journal', (cy) => pt.para(p.review, bodyX, cy, bodyW, 32, colors.text, { maxLines: 14 }));
  if (p.memories) y = pt.section(y, '💌', 'Memories', (cy) => pt.para(p.memories, bodyX, cy, bodyW, 32, colors.text, { maxLines: 10 }));

  const tiers = [['Top', p.topNotes], ['Heart', p.heartNotes], ['Base', p.baseNotes], [p.topNotes.length || p.heartNotes.length || p.baseNotes.length ? 'Also' : '', p.notes]]
    .filter(([, list]) => list.length);
  if (tiers.length) {
    y = pt.section(y, '🌸', 'Notes', (cy) => {
      tiers.forEach(([label, list], i) => {
        if (label && (tiers.length > 1 || label !== 'Also')) {
          pt.text(label.toUpperCase(), bodyX, cy + 28, FONT.ui(26, 500), pt.muted);
          cy += 44;
        }
        cy = pt.chips(list.map((n) => `${noteEmoji(n)} ${n}`), bodyX, cy, bodyW) + (i < tiers.length - 1 ? 24 : 0);
      });
      return cy;
    });
  }
  if (p.accords.length) y = pt.section(y, '🎨', 'Accords', (cy) => pt.chips(p.accords.map((n) => `${noteEmoji(n)} ${n}`), bodyX, cy, bodyW));
  if (p.season.length || p.occasion.length) {
    y = pt.section(y, '🗓️', 'When to wear', (cy) => {
      if (p.season.length) {
        pt.text('SEASON', bodyX, cy + 28, FONT.ui(26, 500), pt.muted);
        cy = pt.chips(p.season, bodyX, cy + 44, bodyW) + (p.occasion.length ? 24 : 0);
      }
      if (p.occasion.length) {
        pt.text('OCCASION', bodyX, cy + 28, FONT.ui(26, 500), pt.muted);
        cy = pt.chips(p.occasion, bodyX, cy + 44, bodyW);
      }
      return cy;
    });
  }
  const hasPerf = LONGEVITY.includes(p.longevity) || SILLAGE.includes(p.sillage);
  if (hasPerf) {
    y = pt.section(y, '💫', 'Performance', (cy) => {
      cy = pt.meter('Longevity', p.longevity, LONGEVITY, bodyX, cy, bodyW);
      return pt.meter('Sillage', p.sillage, SILLAGE, bodyX, cy, bodyW) - 20;
    });
  }
  const facts = [p.whereBought && ['Where I got it', p.whereBought], p.createdAt && ['Added', formatDate(p.createdAt)]].filter(Boolean);
  if (facts.length) {
    y = pt.section(y, '🛍️', 'Details', (cy) => {
      facts.forEach(([k, v]) => {
        pt.text(k, bodyX, cy + 32, FONT.body(30, 500), pt.muted);
        pt.ctx.font = FONT.body(30, 700);
        const vLines = wrap(pt.ctx, v, bodyW * 0.6, 1);
        pt.text(vLines[0], bodyX + bodyW, cy + 32, FONT.body(30, 700), colors.text, 'right');
        cy += 56;
      });
      return cy - 10;
    });
  }

  y = pt.footer(y);
  return pt.finish(y + 20);
}

export async function renderCombo(combo, members, colors) {
  await ensureFonts();
  const pt = new Painter(colors);
  let y = pt.header(PAD - 20);

  const photo = safeDataImage(combo.photo);
  const imgs = photo ? [await loadImage(photo)] : await Promise.all(members.map((m) => loadImage(shareableSrc(m))));
  y = await drawPolaroid(pt, y + 20, 860, photo ? 900 : 860, async (x, iy, w, h) => {
    pt.ctx.fillStyle = mix(colors.bg1, colors.card, 0.5);
    pt.ctx.fillRect(x, iy, w, h);
    if (photo) return drawImageFit(pt.ctx, imgs[0], x, iy, w, h, 'cover');
    const gap = 8;
    collageRects(members.length).forEach((r, i) => {
      const cx = x + r.x * w + gap / 2;
      const cy = iy + r.y * h + gap / 2;
      pt.ctx.fillStyle = colors.card;
      pt.ctx.fillRect(cx, cy, r.w * w - gap, r.h * h - gap);
      drawImageFit(pt.ctx, imgs[i], cx, cy, r.w * w - gap, r.h * h - gap, fitFor(members[i]));
    });
  });

  pt.ctx.font = FONT.ui(30);
  const badge = `💞 Combo · ${members.length} perfumes`;
  const bw = pt.ctx.measureText(badge).width + 56;
  pt.ctx.fillStyle = pt.soft;
  roundRect(pt.ctx, (W - bw) / 2, y, bw, 56, 28);
  pt.ctx.fill();
  pt.text(badge, W / 2, y + 39, FONT.ui(30), colors.text, 'center');
  y += 70;
  y = pt.para(combo.name, PAD, y, INNER, 80, colors.text, { font: FONT.script(80), lineH: 118, maxLines: 3, align: 'center' });
  y += 30;

  const bodyX = PAD + 40;
  const bodyW = INNER - 80;
  if (combo.description) y = pt.section(y, '✍️', 'About this combo', (cy) => pt.para(combo.description, bodyX, cy, bodyW, 32, colors.text, { maxLines: 12 }));

  const thumbs = await Promise.all(members.map((m) => loadImage(shareableSrc(m))));
  y = pt.section(y, '🧴', 'The perfumes', (cy) => {
    members.forEach((m, i) => {
      const th = 150;
      const tw = 112;
      pt.ctx.fillStyle = mix(colors.bg1, colors.card, 0.5);
      roundRect(pt.ctx, bodyX, cy, tw, th, 18);
      pt.ctx.fill();
      pt.ctx.save();
      roundRect(pt.ctx, bodyX, cy, tw, th, 18);
      pt.ctx.clip();
      drawImageFit(pt.ctx, thumbs[i], bodyX, cy, tw, th, fitFor(m));
      pt.ctx.restore();
      const tx = bodyX + tw + 28;
      const textW = bodyW - tw - 28;
      pt.ctx.font = FONT.ui(36);
      const nameLines = wrap(pt.ctx, m.name, textW, 2);
      nameLines.forEach((ln, j) => pt.text(ln, tx, cy + 44 + j * 44, FONT.ui(36), colors.text));
      const by = cy + 44 + nameLines.length * 44;
      pt.ctx.font = FONT.body(28, 600);
      pt.text(wrap(pt.ctx, m.brand, textW, 1)[0], tx, by, FONT.body(28, 600), pt.muted);
      if (m.rating) pt.hearts(m.rating, tx, by + 44, 30, 'left');
      cy += th + 28;
    });
    return cy - 28;
  });

  y = pt.footer(y);
  return pt.finish(y + 20);
}

/* ------------------------------------------------------------ share dialog */

/**
 * @param {object} opts
 *   title       file/dialog name
 *   draw(colors) -> Promise<Blob>
 *   palettes()  -> saved palettes [{ id, name, colors, local? }]
 *   savePalette(name, colors) -> Promise
 *   deletePalette(palette) -> Promise
 */
export function openShare(opts) {
  const dlg = document.getElementById('share');
  let colors = lastColors();
  let role = 'bg1';
  let url = null;
  let blob = null;
  let token = 0;

  const fileName = `${opts.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'perfume'}.png`;
  const canShareFiles = (() => {
    try {
      return Boolean(navigator.canShare?.({ files: [new File([new Blob()], 'x.png', { type: 'image/png' })] }));
    } catch {
      return false;
    }
  })();

  render(dlg, html`
    <div class="share">
      <header class="editor-head">
        <h2>Share ✨</h2>
        <button type="button" class="icon-btn" data-close aria-label="Close">✕</button>
      </header>
      <div class="share-body">
        <div class="share-preview" aria-live="polite">
          <img alt="Preview of the share image for ${opts.title}" hidden>
          <p class="share-loading">Painting your image… 🎨</p>
        </div>
        <div class="share-side">
          <h3 class="share-h">Color palette</h3>
          <div class="palette-list" data-palettes></div>
          <details class="palette-custom">
            <summary>🎚️ Customize colors</summary>
            <div class="role-pills" role="radiogroup" aria-label="Which color to change" data-roles></div>
            <div class="color-editor">
              <div class="color-row">
                <span class="color-swatch" data-swatch></span>
                <label class="hex-field"><span class="sr-only">Hex code</span>
                  <input data-hex maxlength="7" spellcheck="false" autocomplete="off" inputmode="text"></label>
                <label class="native-pick" title="Color picker"><span class="sr-only">Color picker</span><input type="color" data-native></label>
              </div>
              ${[['h', 'Hue', 360], ['s', 'Saturation', 100], ['l', 'Lightness', 100]].map(
                ([k, label, max]) => html`<label class="slider-row"><span>${label}</span>
                  <input type="range" min="0" max="${max}" step="1" data-slider="${k}" class="slider slider-${k}">
                  <output data-out="${k}"></output></label>`,
              )}
            </div>
            <div class="save-palette">
              <label class="field"><span class="sr-only">Palette name</span><input data-palette-name maxlength="40" placeholder="Name your palette"></label>
              <button type="button" class="btn btn-sm" data-save-palette>Save palette</button>
            </div>
          </details>
        </div>
      </div>
      <footer class="editor-foot">
        <span class="spacer"></span>
        ${canShareFiles ? html`<button type="button" class="btn btn-ghost" data-share disabled>📤 Share</button>` : ''}
        <button type="button" class="btn" data-download disabled>⬇︎ Save PNG</button>
      </footer>
    </div>`);

  const img = $('.share-preview img', dlg);
  const loading = $('.share-loading', dlg);

  const repaint = async () => {
    const mine = ++token;
    loading.hidden = false;
    $$('[data-download], [data-share]', dlg).forEach((b) => (b.disabled = true));
    try {
      const out = await opts.draw(colors);
      if (mine !== token || !dlg.open) return;
      blob = out;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);
      img.src = url;
      img.hidden = false;
      loading.hidden = true;
      $$('[data-download], [data-share]', dlg).forEach((b) => (b.disabled = false));
    } catch (err) {
      console.error(err);
      if (mine === token) loading.textContent = 'Couldn’t make the image. Try again?';
    }
  };
  const repaintSoon = debounce(repaint, 160);

  const drawPalettes = () => {
    const saved = opts.palettes();
    const current = JSON.stringify(colors);
    const swatch = (p, removable) => html`
      <div class="palette ${JSON.stringify(p.colors) === current ? 'active' : ''}">
        <button type="button" class="palette-btn" data-palette="${p.id}" aria-pressed="${String(JSON.stringify(p.colors) === current)}">
          <span class="palette-dots">${ROLES.map(([k]) => raw(`<span style="background:${normHex(p.colors[k]) || '#fff'}"></span>`))}</span>
          <span class="palette-name">${p.name}</span>
        </button>
        ${removable ? html`<button type="button" class="palette-del" data-del-palette="${p.id}" aria-label="Delete palette ${p.name}">✕</button>` : ''}
      </div>`;
    render($('[data-palettes]', dlg), [...PRESETS.map((p) => swatch(p, false)), ...saved.map((p) => swatch(p, p.canDelete))]);
  };

  const drawEditor = () => {
    render($('[data-roles]', dlg), ROLES.map(([k, label]) => html`
      <label class="role-pill"><input type="radio" name="role" value="${k}" ${k === role ? raw('checked') : ''}>
        <span><i style="background:${colors[k]}"></i>${label}</span></label>`));
    const hex = colors[role];
    const [h, s, l] = hexToHsl(hex);
    $('[data-swatch]', dlg).style.background = hex;
    const hexInput = $('[data-hex]', dlg);
    if (document.activeElement !== hexInput) hexInput.value = hex;
    $('[data-native]', dlg).value = hex.toLowerCase();
    for (const [k, v] of [['h', h], ['s', s], ['l', l]]) {
      const el = $(`[data-slider="${k}"]`, dlg);
      if (document.activeElement !== el) el.value = v;
      $(`[data-out="${k}"]`, dlg).textContent = k === 'h' ? `${v}°` : `${v}%`;
    }
    // Slider tracks show the colours you'd get.
    const box = $('.color-editor', dlg);
    box.style.setProperty('--sat-from', hslToHex(h, 0, l));
    box.style.setProperty('--sat-to', hslToHex(h, 100, l));
    box.style.setProperty('--light-mid', hslToHex(h, s, 50));
  };

  const setColor = (hex) => {
    colors = { ...colors, [role]: hex };
    rememberColors(colors);
    drawEditor();
    drawPalettes();
    repaintSoon();
  };

  dlg.oninput = (e) => {
    const t = e.target;
    if (t.matches('[data-slider]')) {
      const v = (k) => Number($(`[data-slider="${k}"]`, dlg).value);
      setColor(hslToHex(v('h'), v('s'), v('l')));
    } else if (t.matches('[data-hex]')) {
      const hex = normHex(t.value);
      t.setAttribute('aria-invalid', String(!hex));
      if (hex) setColor(hex);
    } else if (t.matches('[data-native]')) {
      setColor(normHex(t.value));
    } else if (t.name === 'role') {
      role = t.value;
      drawEditor();
    }
  };

  dlg.onclick = async (e) => {
    const t = e.target;
    if (t.closest('[data-close]')) return dlg.close();
    const pal = t.closest('[data-palette]');
    if (pal) {
      const p = [...PRESETS, ...opts.palettes()].find((x) => x.id === pal.dataset.palette);
      if (p) {
        colors = { ...cleanColors(p.colors) };
        rememberColors(colors);
        drawPalettes();
        drawEditor();
        repaint();
      }
      return;
    }
    const del = t.closest('[data-del-palette]');
    if (del) {
      const p = opts.palettes().find((x) => x.id === del.dataset.delPalette);
      if (p) {
        await opts.deletePalette(p);
        drawPalettes();
      }
      return;
    }
    if (t.closest('[data-save-palette]')) {
      const input = $('[data-palette-name]', dlg);
      const name = input.value.trim();
      if (!name) {
        input.focus();
        toast('Give your palette a name first');
        return;
      }
      await opts.savePalette(name, { ...colors });
      input.value = '';
      toast(`Saved “${name}” 🎨`);
      setTimeout(drawPalettes, 300);
      return;
    }
    if (t.closest('[data-download]') && blob) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    if (t.closest('[data-share]') && blob) {
      try {
        await navigator.share({ files: [new File([blob], fileName, { type: 'image/png' })], title: opts.title });
      } catch (err) {
        if (err.name !== 'AbortError') toast('Sharing didn’t work. Try Save PNG instead.');
      }
    }
  };

  dlg.onclose = () => {
    token++;
    if (url) URL.revokeObjectURL(url);
  };

  drawPalettes();
  drawEditor();
  dlg.showModal();
  repaint();

  // Saved palettes may arrive after the dialog opens.
  return { refreshPalettes: () => dlg.open && drawPalettes() };
}

function cleanColors(c) {
  const out = {};
  for (const [k] of ROLES) out[k] = normHex(c?.[k]) || PRESETS[0].colors[k];
  return out;
}
function lastColors() {
  try {
    return cleanColors(JSON.parse(localStorage.getItem(LAST_KEY)) || PRESETS[0].colors);
  } catch {
    return { ...PRESETS[0].colors };
  }
}
function rememberColors(c) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}
