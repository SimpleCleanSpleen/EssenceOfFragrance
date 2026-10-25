// Combos: 2–10 perfumes layered together, with a name, an optional description and photo.

import { html, raw, render, $, $$, fold, safeDataImage } from './util.js';
import { imgTag, processPhoto, PLACEHOLDER } from './images.js';
import { hearts } from './views.js';

export const COMBO_MIN = 2;
export const COMBO_MAX = 10;

export function normalizeCombo(c) {
  return {
    id: c.id,
    name: String(c.name || ''),
    description: String(c.description || ''),
    perfumeIds: Array.isArray(c.perfumeIds) ? c.perfumeIds.map(String) : [],
    photo: c.photo || null,
    createdAt: c.createdAt || null,
  };
}

/**
 * Collage cells as fractions of the frame. Shared by the page collage and the share image.
 * The first perfume grows to fill any gap so the grid is always complete.
 */
export function collageRects(n) {
  if (n <= 1) return [{ x: 0, y: 0, w: 1, h: 1 }];
  const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const empty = rows * cols - n;
  const cw = 1 / cols;
  const rh = 1 / rows;
  const taken = new Set();
  const rects = [{ x: 0, y: 0, w: cw, h: rh * (empty + 1) }];
  for (let r = 0; r <= empty; r++) taken.add(`${r},0`);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!taken.has(`${r},${c}`) && rects.length < n) rects.push({ x: c * cw, y: r * rh, w: cw, h: rh });
    }
  }
  return rects;
}

/** The combo's own photo, or a collage of its perfumes. */
export function comboImage(combo, members, cls = '') {
  const photo = safeDataImage(combo.photo);
  if (photo) {
    return html`<div class="combo-img ${cls}"><img src="${photo}" alt="Photo of the ${combo.name} combo" loading="lazy"></div>`;
  }
  const rects = collageRects(members.length);
  return html`<div class="combo-img collage ${cls}" role="img" aria-label="Collage of ${members.map((p) => p.name).join(', ')}">
    ${members.map((p, i) => {
      const r = rects[i];
      return html`<div class="collage-cell" style="left:${pct(r.x)};top:${pct(r.y)};width:${pct(r.w)};height:${pct(r.h)}">${raw(imgTag(p))}</div>`;
    })}
  </div>`;
}

const pct = (f) => `${(f * 100).toFixed(4)}%`;

export function membersOf(combo, findPerfume) {
  return combo.perfumeIds.map(findPerfume).filter(Boolean);
}

/* ------------------------------------------------------------ pages */

export function comboCard(combo, members) {
  return html`
    <article class="combo-card">
      <a href="#/combo/${encodeURIComponent(combo.id)}" class="combo-link">
        ${comboImage(combo, members)}
        <div class="combo-body">
          <h3 class="combo-name">${combo.name}</h3>
          <p class="combo-meta">${members.length} perfumes</p>
          ${combo.description ? html`<p class="combo-desc">${combo.description}</p>` : ''}
        </div>
      </a>
    </article>`;
}

export function combosPage(combos, findPerfume, { isOwner, loaded }) {
  return html`
    <div class="combos-page">
      <div class="page-head">
        <div>
          <h1 class="page-title">Combos</h1>
          <p class="subtitle">Perfumes that are even better together 💞</p>
        </div>
        ${isOwner ? html`<button class="btn" data-action="add-combo">+ New combo</button>` : ''}
      </div>
      ${!loaded
        ? html`<div class="combo-grid">${[1, 2, 3].map(() => html`<div class="card skeleton" aria-hidden="true"></div>`)}</div>`
        : combos.length
          ? html`<div class="combo-grid">${combos.map((c) => comboCard(c, membersOf(c, findPerfume)))}</div>`
          : html`<div class="empty">
              <h3>No combos yet</h3>
              <p>Layer two or more perfumes and give the combo a name.</p>
              ${isOwner ? html`<button class="btn" data-action="add-combo">+ New combo</button>` : ''}
            </div>`}
    </div>`;
}

export function comboDetail(combo, members, { isOwner, card }) {
  return html`
    <div class="detail combo-detail">
      <a href="#/combos" class="back" data-action="back"><span aria-hidden="true">←</span> Back</a>
      <div class="detail-hero">
        <div class="polaroid combo-polaroid">${comboImage(combo, members, 'big')}<span class="tape" aria-hidden="true"></span></div>
        <div class="detail-head">
          <span class="badge badge-combo"><span aria-hidden="true">💞</span> Combo · ${members.length} perfumes</span>
          <h1 class="detail-name">${combo.name}</h1>
          ${combo.description ? html`<p class="prose combo-description">${combo.description}</p>` : ''}
          <div class="owner-row">
            <button class="btn btn-ghost" data-action="share-combo" data-id="${combo.id}">📤 Share</button>
            ${isOwner
              ? html`<button class="btn" data-action="edit-combo" data-id="${combo.id}">✎ Edit</button>
                     <button class="btn btn-ghost danger" data-action="delete-combo" data-id="${combo.id}">Delete</button>`
              : ''}
          </div>
        </div>
      </div>
      <h2 class="section-title">In this combo</h2>
      <div class="grid">${members.map(card)}</div>
    </div>`;
}

/** "Part of these combos" panel on a perfume page. */
export function combosPanel(combos, findPerfume) {
  if (!combos.length) return '';
  return html`<section class="panel"><h3><span aria-hidden="true">💞</span> In combos</h3>
    <ul class="combo-mini-list">${combos.map((c) => html`<li><a href="#/combo/${encodeURIComponent(c.id)}">
      ${comboImage(c, membersOf(c, findPerfume), 'mini')}<span><strong>${c.name}</strong><small>${c.perfumeIds.length} perfumes</small></span></a></li>`)}
    </ul></section>`;
}

/* ------------------------------------------------------------ editor */

/**
 * Open the combo editor. Resolves with the saved id, 'deleted', or null.
 * @param {object|null} combo       existing combo, or a partial one ({ perfumeIds }) to start from
 * @param {object[]} allPerfumes    everything that can be picked
 * @param {object} handlers         { save(data, id?) -> id, remove(id) -> bool }
 */
export function openComboEditor(combo, allPerfumes, handlers) {
  const isNew = !combo?.id;
  const c = normalizeCombo(combo || {});
  const byId = new Map(allPerfumes.map((p) => [p.id, p]));
  let selected = c.perfumeIds.filter((id) => byId.has(id));
  let photo = c.photo;
  let query = '';
  const dlg = document.getElementById('editor');

  render(dlg, html`
    <form class="editor" novalidate>
      <header class="editor-head">
        <h2>${isNew ? 'New combo 💞' : 'Edit combo'}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Close">✕</button>
      </header>
      <div class="editor-body">
        <label class="field"><span class="label">Name *</span>
          <input name="name" required maxlength="120" autocomplete="off" value="${c.name}" placeholder="Vanilla cloud, Beach day…"></label>
        <label class="field"><span class="label">Description</span>
          <textarea name="description" rows="3" placeholder="How do you layer them? When do you wear it?">${c.description}</textarea></label>

        <div class="photo-field">
          <div class="photo-preview polaroid" data-combo-preview></div>
          <div class="photo-actions">
            <label class="btn btn-soft">📷 Take photo<input type="file" accept="image/*" capture="environment" hidden data-photo-input></label>
            <label class="btn btn-soft">🖼️ Choose photo<input type="file" accept="image/*" hidden data-photo-input></label>
            <button type="button" class="btn btn-ghost" data-remove-photo>Use collage instead</button>
            <p class="hint" data-photo-status aria-live="polite">Optional. Without a photo, a collage of the perfumes is made for you.</p>
          </div>
        </div>

        <fieldset class="field">
          <legend>Perfumes <span class="pick-count" data-count></span></legend>
          <ol class="picked" data-picked></ol>
          <label class="search picker-search">
            <span class="sr-only">Find a perfume to add</span>
            <span class="search-icon" aria-hidden="true">🔍</span>
            <input type="search" data-pick-search placeholder="Find a perfume to add…" autocomplete="off">
          </label>
          <ul class="pick-results" data-results aria-live="polite"></ul>
        </fieldset>
        <p class="form-error" role="alert" data-error></p>
      </div>
      <footer class="editor-foot">
        ${!isNew ? html`<button type="button" class="btn btn-ghost danger" data-delete>Delete</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn" data-save>${isNew ? 'Create combo' : 'Save changes'}</button>
      </footer>
    </form>`);

  const form = $('form', dlg);
  const err = $('[data-error]', dlg);

  const drawPreview = () => {
    const members = selected.map((id) => byId.get(id));
    const el = $('[data-combo-preview]', dlg);
    if (!photo && !members.length) render(el, html`<div class="combo-img"><img src="${PLACEHOLDER}" alt=""></div>`);
    else render(el, comboImage({ ...c, photo }, members));
    $('[data-remove-photo]', dlg).hidden = !photo;
  };

  const drawPicked = () => {
    $('[data-count]', dlg).textContent = `${selected.length} / ${COMBO_MAX}`;
    render($('[data-picked]', dlg), selected.length
      ? selected.map((id, i) => {
          const p = byId.get(id);
          return html`<li class="picked-item">
            <span class="picked-thumb">${raw(imgTag(p))}</span>
            <span class="picked-text"><strong>${p.name}</strong><small>${p.brand}</small></span>
            <span class="picked-actions">
              <button type="button" class="mini-btn" data-up="${i}" aria-label="Move ${p.name} up" ${i === 0 ? raw('disabled') : ''}>↑</button>
              <button type="button" class="mini-btn" data-unpick="${id}" aria-label="Remove ${p.name}">✕</button>
            </span>
          </li>`;
        })
      : html`<li class="hint picked-empty">Pick at least ${COMBO_MIN} perfumes below.</li>`);
    drawPreview();
  };

  const drawResults = () => {
    const q = fold(query.trim());
    const full = selected.length >= COMBO_MAX;
    let list = allPerfumes.filter((p) => !selected.includes(p.id));
    if (q) list = list.filter((p) => fold(`${p.name} ${p.brand}`).includes(q));
    else list = [...list].sort((a, b) => (a.status === 'have' ? 0 : 1) - (b.status === 'have' ? 0 : 1) || b.rating - a.rating || a.name.localeCompare(b.name));
    list = list.slice(0, 30);
    render($('[data-results]', dlg), list.length
      ? list.map((p) => html`<li><button type="button" class="pick-row" data-pick="${p.id}" ${full ? raw('disabled') : ''}>
          <span class="picked-thumb">${raw(imgTag(p))}</span>
          <span class="picked-text"><strong>${p.name}</strong><small>${p.brand}</small></span>
          ${hearts(p.rating, { size: 'sm' })}
          <span class="pick-plus" aria-hidden="true">+</span>
        </button></li>`)
      : html`<li class="hint">No perfumes match “${query}”.</li>`);
  };

  drawPicked();
  drawResults();

  $('[data-pick-search]', dlg).addEventListener('input', (e) => {
    query = e.target.value;
    drawResults();
  });
  // Listen on the form (re-created each time), not the shared <dialog>, so listeners don't pile up.
  form.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick]');
    const unpick = e.target.closest('[data-unpick]');
    const up = e.target.closest('[data-up]');
    if (pick && selected.length < COMBO_MAX) selected.push(pick.dataset.pick);
    else if (unpick) selected = selected.filter((id) => id !== unpick.dataset.unpick);
    else if (up) {
      const i = Number(up.dataset.up);
      [selected[i - 1], selected[i]] = [selected[i], selected[i - 1]];
    } else return;
    err.textContent = '';
    drawPicked();
    drawResults();
  });

  $$('[data-photo-input]', dlg).forEach((input) =>
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const status = $('[data-photo-status]', dlg);
      status.textContent = 'Shrinking your photo… ✨';
      try {
        photo = await processPhoto(file);
        status.textContent = 'Photo ready.';
        drawPreview();
      } catch (ex) {
        status.textContent = ex.message;
      }
    }),
  );
  $('[data-remove-photo]', dlg).addEventListener('click', () => {
    photo = null;
    drawPreview();
  });

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (dlg.open) dlg.close();
      resolve(value);
    };
    dlg.onclose = () => finish(null);
    dlg.oncancel = () => finish(null);
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => finish(null)));
    $('[data-delete]', dlg)?.addEventListener('click', async () => {
      if (await handlers.remove(c.id)) finish('deleted');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      if (!name) {
        err.textContent = 'Give your combo a name.';
        form.elements.name.focus();
        return;
      }
      if (selected.length < COMBO_MIN) {
        err.textContent = `A combo needs at least ${COMBO_MIN} perfumes.`;
        $('[data-pick-search]', dlg).focus();
        return;
      }
      const btn = $('[data-save]', dlg);
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        const data = { name, description: form.elements.description.value.trim(), perfumeIds: selected, photo: photo || null };
        finish(await handlers.save(data, isNew ? undefined : c.id));
      } catch (ex) {
        console.error(ex);
        err.textContent = ex?.message || 'Something went wrong. Please try again.';
        btn.disabled = false;
        btn.textContent = isNew ? 'Create combo' : 'Save changes';
      }
    });

    dlg.showModal();
    if (isNew) form.elements.name.focus();
  });
}
