// HTML builders for each screen. Pure functions: data in, markup out.

import { STATUSES, STATUS_BY_ID, LONGEVITY, SILLAGE, SORTS } from './constants.js';
import { html, raw, safeUrl, formatDate } from './util.js';
import { imgTag } from './images.js';
import { noteEmoji } from './notes.js';

export function hearts(rating, { size = '' } = {}) {
  const r = Math.round(rating || 0);
  const label = r ? `Rated ${r} out of 5 hearts` : 'Not rated yet';
  return html`<span class="hearts ${size}" role="img" aria-label="${label}">${[1, 2, 3, 4, 5].map(
    (i) => raw(`<span class="heart ${i <= r ? 'on' : ''}" aria-hidden="true">♥</span>`),
  )}</span>`;
}

export function statusBadge(status) {
  const s = STATUS_BY_ID[status] || STATUS_BY_ID.have;
  return html`<span class="badge badge-${s.id}"><span aria-hidden="true">${s.icon}</span> ${s.badge}</span>`;
}

export function card(p, { isOwner, canEdit }) {
  return html`
    <article class="card" style="--tilt:${tilt(p.id)}deg">
      <a class="card-link" href="#/p/${encodeURIComponent(p.id)}" aria-label="${p.name} by ${p.brand}">
        <div class="card-img">${raw(imgTag(p))}</div>
        <div class="card-body">
          <h3 class="card-name">${p.name}</h3>
          <p class="card-brand">${p.brand}</p>
          ${hearts(p.rating, { size: 'sm' })}
        </div>
      </a>
      <div class="card-badge">${statusBadge(p.status)}</div>
      ${isOwner && canEdit
        ? html`<button class="icon-btn card-edit" data-action="edit" data-id="${p.id}" aria-label="Edit ${p.name}">✎</button>`
        : ''}
    </article>`;
}

// A tiny stable rotation per card so the grid feels like stickers in a scrapbook.
function tilt(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.35;
}

export function tabs(active, counts) {
  const all = [...STATUSES.map((s) => ({ id: s.id, label: s.tab, icon: s.icon })), { id: 'all', label: 'Everything', icon: '🎀' }];
  return html`${all.map(
    (t) => html`<button role="tab" class="tab ${t.id === active ? 'active' : ''}" aria-selected="${String(t.id === active)}"
        data-tab="${t.id}"><span aria-hidden="true">${t.icon}</span> ${t.label} <span class="count">${counts[t.id] ?? 0}</span></button>`,
  )}`;
}

export function brandOptions(brands, selected) {
  return html`<option value="">All brands</option>${brands.map(
    ([b, n]) => html`<option value="${b}" ${b === selected ? raw('selected') : ''}>${b} (${n})</option>`,
  )}`;
}

export function sortOptions(selected) {
  return html`${SORTS.map((s) => html`<option value="${s.id}" ${s.id === selected ? raw('selected') : ''}>${s.label}</option>`)}`;
}

export function potd(p) {
  if (!p) return '';
  return html`
    <a class="potd" href="#/p/${encodeURIComponent(p.id)}">
      <div class="potd-img">${raw(imgTag(p))}</div>
      <div class="potd-text">
        <p class="eyebrow"><span aria-hidden="true">☀️</span> Perfume of the day</p>
        <h2 class="potd-name">${p.name}</h2>
        <p class="potd-brand">${p.brand}</p>
        ${hearts(p.rating)}
      </div>
      <span class="sparkle s1" aria-hidden="true">✦</span><span class="sparkle s2" aria-hidden="true">✧</span>
    </a>`;
}

export function emptyState({ tab, filtered, isOwner }) {
  const msgs = {
    have: ['Your vanity is empty!', 'Add the perfumes you own and they’ll sparkle here.'],
    had: ['No past loves yet', 'Perfumes you used to own will live here, memories and all.'],
    want: ['Wishlist is empty', 'Dream big! Add perfumes you’re longing for.'],
    testing: ['Nothing to test', 'Samples and decants you want to try go here.'],
    all: ['No perfumes yet', 'Your journal is waiting for its first page.'],
  };
  const [title, text] = filtered ? ['No matches', 'Try a different search or brand.'] : msgs[tab] || msgs.all;
  return html`
    <div class="empty">
      ${raw(BOTTLE_DOODLE)}
      <h3>${title}</h3>
      <p>${text}</p>
      ${isOwner && !filtered ? html`<button class="btn" data-action="add">+ Add perfume</button>` : ''}
    </div>`;
}

const BOTTLE_DOODLE = `<svg class="empty-art" viewBox="0 0 120 120" aria-hidden="true">
  <defs><linearGradient id="eg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB3D4"/><stop offset="1" stop-color="#C9B6FF"/></linearGradient></defs>
  <rect x="48" y="14" width="24" height="14" rx="4" fill="#A8D8FF"/>
  <rect x="54" y="28" width="12" height="10" fill="#E9E1FF"/>
  <rect x="26" y="38" width="68" height="68" rx="22" fill="url(#eg)"/>
  <circle cx="48" cy="66" r="3.4" fill="#4A2560"/><circle cx="72" cy="66" r="3.4" fill="#4A2560"/>
  <path d="M53 76q7 6 14 0" stroke="#4A2560" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="40" cy="76" r="5" fill="#FF5FA2" opacity=".5"/><circle cx="80" cy="76" r="5" fill="#FF5FA2" opacity=".5"/>
  <path d="M100 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FF5FA2"/>
  <path d="M16 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#A8D8FF"/>
</svg>`;

function hasPyramid(p) {
  return p.topNotes.length || p.heartNotes.length || p.baseNotes.length;
}

function chips(list, cls = '') {
  if (!list?.length) return '';
  return html`<ul class="chips ${cls}">${list.map((x) => html`<li class="chip">${x}</li>`)}</ul>`;
}

export function noteHref(note) {
  return `#/note/${encodeURIComponent(note.trim())}`;
}

/** Notes and accords: an emoji each, and a link to every perfume sharing that note. */
function noteChips(list, cls = '') {
  if (!list?.length) return '';
  return html`<ul class="chips ${cls}">${list.map(
    (n) => html`<li><a class="chip note-chip" href="${noteHref(n)}" title="Other perfumes with ${n}"><span class="note-emoji" aria-hidden="true">${noteEmoji(n)}</span> ${n}</a></li>`,
  )}</ul>`;
}

function meter(value, scale, label) {
  const i = scale.indexOf(value);
  if (i < 0) return '';
  return html`
    <div class="meter">
      <div class="meter-head"><span>${label}</span><strong>${value}</strong></div>
      <div class="meter-track" role="img" aria-label="${label}: ${value}">
        ${scale.map((_, j) => raw(`<span class="${j <= i ? 'on' : ''}"></span>`))}
      </div>
    </div>`;
}

function section(title, icon, body, ownerHint, isOwner) {
  if (!body) return isOwner && ownerHint ? html`<section class="panel muted-panel"><h3><span aria-hidden="true">${icon}</span> ${title}</h3><p class="hint">${ownerHint}</p></section>` : '';
  return html`<section class="panel"><h3><span aria-hidden="true">${icon}</span> ${title}</h3>${body}</section>`;
}

function para(text) {
  return text ? html`<p class="prose">${text}</p>` : '';
}

export function detail(p, { isOwner, canEdit }) {
  const hasNotes = p.topNotes.length || p.heartNotes.length || p.baseNotes.length || p.notes.length;
  const pyramid = hasNotes
    ? html`<div class="pyramid">
        ${p.topNotes.length ? html`<div class="tier"><h4>Top</h4>${noteChips(p.topNotes, 'top')}</div>` : ''}
        ${p.heartNotes.length ? html`<div class="tier"><h4>Heart</h4>${noteChips(p.heartNotes, 'heart')}</div>` : ''}
        ${p.baseNotes.length ? html`<div class="tier"><h4>Base</h4>${noteChips(p.baseNotes, 'base')}</div>` : ''}
        ${p.notes.length ? html`<div class="tier">${hasPyramid(p) ? html`<h4>Also</h4>` : ''}${noteChips(p.notes, 'heart')}</div>` : ''}
      </div>`
    : '';
  const wear = p.season.length || p.occasion.length
    ? html`${p.season.length ? html`<h4>Season</h4>${chips(p.season, 'season')}` : ''}
           ${p.occasion.length ? html`<h4>Occasion</h4>${chips(p.occasion, 'occasion')}` : ''}`
    : '';
  const perf = p.longevity || p.sillage
    ? html`${meter(p.longevity, LONGEVITY, 'Longevity')}${meter(p.sillage, SILLAGE, 'Sillage')}`
    : '';
  const facts = [
    p.whereBought && html`<div><dt>Where I got it</dt><dd>${p.whereBought}</dd></div>`,
    p.createdAt && html`<div><dt>Added</dt><dd>${formatDate(p.createdAt)}</dd></div>`,
  ].filter(Boolean);
  const fragUrl = safeUrl(p.fragranticaUrl);

  return html`
    <div class="detail">
      <a href="#/" class="back" data-action="back"><span aria-hidden="true">←</span> Back</a>
      <div class="detail-hero">
        <div class="detail-img polaroid">${raw(imgTag(p))}<span class="tape" aria-hidden="true"></span></div>
        <div class="detail-head">
          ${statusBadge(p.status)}
          <h1 class="detail-name">${p.name}</h1>
          <p class="detail-brand">${p.brand}</p>
          ${hearts(p.rating, { size: 'lg' })}
          ${p.sample ? html`<p class="hint">✨ Sample entry, shown until your real journal is imported.</p>` : ''}
          ${isOwner && canEdit
            ? html`<div class="move-row" role="group" aria-label="Move to another list">
                ${STATUSES.filter((s) => s.id !== p.status).map(
                  (s) => html`<button class="chip-btn" data-action="move" data-id="${p.id}" data-status="${s.id}"><span aria-hidden="true">${s.icon}</span> ${s.move}</button>`,
                )}
              </div>
              <div class="owner-row">
                <button class="btn" data-action="edit" data-id="${p.id}">✎ Edit</button>
                <button class="btn btn-ghost danger" data-action="delete" data-id="${p.id}">Delete</button>
              </div>`
            : ''}
        </div>
      </div>

      <div class="detail-grid">
        ${section('My journal', '📖', para(p.review), 'No journal entry yet. Tap Edit to write one.', isOwner)}
        ${section('Memories', '💌', para(p.memories), '', isOwner)}
        ${section('Notes', '🌸', pyramid, 'Add top, heart and base notes.', isOwner)}
        ${section('Accords', '🎨', noteChips(p.accords, 'accord'), '', isOwner)}
        ${section('When to wear', '🗓️', wear, '', isOwner)}
        ${section('Performance', '💫', perf, '', isOwner)}
        ${facts.length || fragUrl
          ? html`<section class="panel"><h3><span aria-hidden="true">🛍️</span> Details</h3>
              ${facts.length ? html`<dl class="facts">${facts}</dl>` : ''}
              ${fragUrl ? html`<a class="btn btn-ghost" href="${fragUrl}" target="_blank" rel="noopener noreferrer">View on Fragrantica ↗</a>` : ''}
            </section>`
          : ''}
      </div>
    </div>`;
}

export function stats(perfumes) {
  const by = Object.fromEntries(STATUSES.map((s) => [s.id, 0]));
  perfumes.forEach((p) => (by[p.status] = (by[p.status] || 0) + 1));

  const brandCounts = {};
  perfumes.filter((p) => p.status === 'have').forEach((p) => (brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1));
  let topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  let brandScope = 'in your collection';
  if (!topBrands.length) {
    perfumes.forEach((p) => (brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1));
    topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    brandScope = 'across your journal';
  }
  const maxBrand = topBrands[0]?.[1] || 1;

  const loved = perfumes.filter((p) => p.rating > 0).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)).slice(0, 8);

  const noteCounts = {};
  perfumes.forEach((p) => [...p.topNotes, ...p.heartNotes, ...p.baseNotes, ...p.notes, ...p.accords].forEach((n) => {
    const k = n.trim().toLowerCase();
    if (k) noteCounts[k] = (noteCounts[k] || 0) + 1;
  }));
  const topNotes = Object.entries(noteCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);

  return html`
    <div class="stats">
      <a href="#/" class="back"><span aria-hidden="true">←</span> Back to journal</a>
      <h1 class="page-title">My perfume stats</h1>
      <p class="subtitle">${perfumes.length} perfumes and counting ♡</p>
      <div class="stat-tiles">
        ${STATUSES.map((s) => html`<div class="stat-tile tile-${s.id}"><span class="stat-icon" aria-hidden="true">${s.icon}</span><strong>${by[s.id]}</strong><span>${s.tab}</span></div>`)}
      </div>
      <div class="detail-grid">
        <section class="panel">
          <h3><span aria-hidden="true">👑</span> Top brands <small>${brandScope}</small></h3>
          <ol class="bars">
            ${topBrands.map(([b, n]) => html`<li><span class="bar-label">${b}</span><span class="bar"><span style="width:${Math.max(8, (n / maxBrand) * 100)}%"></span></span><span class="bar-n">${n}</span></li>`)}
          </ol>
        </section>
        <section class="panel">
          <h3><span aria-hidden="true">💗</span> Most loved</h3>
          ${loved.length
            ? html`<ol class="loved">${loved.map((p) => html`<li><a href="#/p/${encodeURIComponent(p.id)}"><span class="loved-name">${p.name}</span> <span class="loved-brand">${p.brand}</span></a>${hearts(p.rating, { size: 'sm' })}</li>`)}</ol>`
            : html`<p class="hint">Rate some perfumes with hearts and your favorites will show up here.</p>`}
        </section>
        ${topNotes.length
          ? html`<section class="panel"><h3><span aria-hidden="true">🌷</span> Notes & accords you love</h3>
              <ul class="chips cloud">${topNotes.map(([n, c]) => html`<li><a class="chip note-chip" href="${noteHref(n)}" style="--w:${Math.min(1.5, 0.9 + c * 0.1)}"><span aria-hidden="true">${noteEmoji(n)}</span> ${n} <small>×${c}</small></a></li>`)}</ul></section>`
          : ''}
      </div>
    </div>`;
}

const TIER_LABEL = { topNotes: 'top', heartNotes: 'heart', baseNotes: 'base', notes: 'note', accords: 'accord' };

/** Every perfume containing a note. matches: [{ perfume, where: ['topNotes', ...] }] */
export function notePage(note, matches, { isOwner, canEdit, loaded }) {
  const count = matches.length;
  return html`
    <div class="note-page">
      <a href="#/" class="back" data-action="back"><span aria-hidden="true">←</span> Back</a>
      <div class="note-hero">
        <span class="note-hero-emoji" aria-hidden="true">${noteEmoji(note)}</span>
        <div>
          <p class="eyebrow">Note</p>
          <h1 class="page-title">${note}</h1>
          <p class="subtitle">${loaded ? `${count} ${count === 1 ? 'perfume' : 'perfumes'} with this note ♡` : 'Loading…'}</p>
        </div>
      </div>
      ${loaded && !count
        ? html`<div class="empty"><h3>No perfumes with this note</h3><p>Add notes to a perfume and it will show up here.</p></div>`
        : html`<div class="grid">${matches.map(({ perfume, where }) => html`
            <div class="note-card">
              ${card(perfume, { isOwner, canEdit: canEdit(perfume) })}
              <p class="note-where">${where.map((w) => TIER_LABEL[w]).join(' · ')}</p>
            </div>`)}</div>`}
    </div>`;
}
