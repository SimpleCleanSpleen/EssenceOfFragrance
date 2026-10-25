// The add / edit perfume dialog.

import { STATUSES, SEASONS, OCCASIONS, LONGEVITY, SILLAGE, EMPTY_PERFUME } from './constants.js';
import { html, raw, render, $, $$, toList, safeUrl } from './util.js';
import { processPhoto, photoSrc, PLACEHOLDER } from './images.js';

const dialog = () => document.getElementById('editor');

/**
 * Open the editor. Resolves with the saved perfume id, or null if cancelled.
 * @param {object|null} perfume   existing perfume, or null to add a new one
 * @param {object} handlers       { save(data, id?) -> id, remove(id) -> bool }
 */
export function openEditor(perfume, handlers) {
  const isNew = !perfume;
  const p = { ...EMPTY_PERFUME, ...(perfume || {}) };
  let photo = p.photo || null;
  const dlg = dialog();

  render(dlg, html`
    <form class="editor" method="dialog" novalidate>
      <header class="editor-head">
        <h2>${isNew ? 'Add a perfume ✨' : 'Edit perfume'}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Close">✕</button>
      </header>

      <div class="editor-body">
        <div class="photo-field">
          <div class="photo-preview polaroid"><img alt="Photo preview" referrerpolicy="no-referrer" data-fallback="${PLACEHOLDER}"></div>
          <div class="photo-actions">
            <label class="btn btn-soft">📷 Take photo<input type="file" accept="image/*" capture="environment" hidden data-photo-input></label>
            <label class="btn btn-soft">🖼️ Choose photo<input type="file" accept="image/*" hidden data-photo-input></label>
            <button type="button" class="btn btn-ghost" data-remove-photo>Remove my photo</button>
            <p class="hint" data-photo-status aria-live="polite"></p>
          </div>
        </div>

        <div class="row2">
          ${field('brand', 'Brand *', html`<input name="brand" required autocomplete="off" value="${p.brand}" list="brand-list">`)}
          ${field('name', 'Name *', html`<input name="name" required autocomplete="off" value="${p.name}">`)}
        </div>
        ${p.originalName && p.originalName !== p.name ? html`<p class="hint">Originally imported as “${p.originalName}”.</p>` : ''}

        <fieldset class="field">
          <legend>List</legend>
          <div class="seg">
            ${STATUSES.map((s) => html`<label class="seg-opt"><input type="radio" name="status" value="${s.id}" ${p.status === s.id ? raw('checked') : ''}><span><span aria-hidden="true">${s.icon}</span> ${s.tab}</span></label>`)}
          </div>
        </fieldset>

        <fieldset class="field">
          <legend>Rating</legend>
          <div class="heart-picker">
            ${[0, 1, 2, 3, 4, 5].map((n) => html`<label class="${n === 0 ? 'hp-none' : ''}"><input type="radio" name="rating" value="${n}" ${Math.round(p.rating) === n ? raw('checked') : ''}><span aria-hidden="true">${n === 0 ? '∅' : '♥'}</span><span class="sr-only">${n === 0 ? 'No rating' : `${n} heart${n > 1 ? 's' : ''}`}</span></label>`)}
          </div>
        </fieldset>

        ${field('review', 'My journal entry', html`<textarea name="review" rows="4" placeholder="How does it make you feel?">${p.review}</textarea>`)}

        <div class="row3">
          ${field('topNotes', 'Top notes', html`<input name="topNotes" value="${p.topNotes.join(', ')}" placeholder="bergamot, pear">`)}
          ${field('heartNotes', 'Heart notes', html`<input name="heartNotes" value="${p.heartNotes.join(', ')}" placeholder="rose, jasmine">`)}
          ${field('baseNotes', 'Base notes', html`<input name="baseNotes" value="${p.baseNotes.join(', ')}" placeholder="vanilla, musk">`)}
        </div>
        ${field('notes', 'Other notes (no top/heart/base)', html`<input name="notes" value="${p.notes.join(', ')}" placeholder="sugar, vanilla, yeast">`)}
        ${field('accords', 'Accords', html`<input name="accords" value="${p.accords.join(', ')}" placeholder="sweet, powdery, gourmand">`)}
        <p class="hint">Separate notes with commas.</p>

        ${checks('season', 'Season', SEASONS, p.season)}
        ${checks('occasion', 'Occasion', OCCASIONS, p.occasion)}

        <div class="row2">
          ${field('longevity', 'Longevity', select('longevity', LONGEVITY, p.longevity))}
          ${field('sillage', 'Sillage', select('sillage', SILLAGE, p.sillage))}
        </div>

        ${field('memories', 'Memories', html`<textarea name="memories" rows="3" placeholder="Where were you? Who were you with?">${p.memories}</textarea>`)}
        ${field('whereBought', 'Where I got it', html`<input name="whereBought" value="${p.whereBought}" placeholder="Sephora, a swap, a gift from…">`)}

        <details class="more" ${isNew ? '' : raw('open')}>
          <summary>Links & image</summary>
          ${field('fragranticaUrl', 'Fragrantica link', html`<input name="fragranticaUrl" type="url" inputmode="url" value="${p.fragranticaUrl}" placeholder="https://www.fragrantica.com/perfume/…">`)}
          ${field('imageUrl', 'Bottle image URL', html`<input name="imageUrl" type="url" inputmode="url" value="${p.imageUrl}" placeholder="https://…">`)}
        </details>
        <p class="form-error" role="alert" data-error></p>
      </div>

      <footer class="editor-foot">
        ${!isNew ? html`<button type="button" class="btn btn-ghost danger" data-delete>Delete</button>` : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-close>Cancel</button>
        <button type="submit" class="btn" data-save>${isNew ? 'Add to journal' : 'Save changes'}</button>
      </footer>
    </form>`);

  const form = $('form', dlg);
  const preview = $('.photo-preview img', dlg);
  const status = $('[data-photo-status]', dlg);
  const removeBtn = $('[data-remove-photo]', dlg);

  const refreshPreview = () => {
    preview.src = photoSrc({ photo, imageUrl: form.elements.imageUrl.value });
    removeBtn.hidden = !photo;
  };
  refreshPreview();
  form.elements.imageUrl.addEventListener('change', refreshPreview);

  $$('[data-photo-input]', dlg).forEach((input) =>
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      status.textContent = 'Shrinking your photo… ✨';
      try {
        photo = await processPhoto(file);
        status.textContent = `Photo ready (${Math.round((photo.length * 0.75) / 1024)} KB).`;
        refreshPreview();
      } catch (err) {
        status.textContent = err.message;
      }
    }),
  );
  removeBtn.addEventListener('click', () => {
    photo = null;
    status.textContent = 'Photo removed. The bottle image will show instead.';
    refreshPreview();
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
      if (await handlers.remove(p.id)) finish('deleted');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('[data-error]', dlg);
      const data = readForm(form, photo);
      if (!data.brand || !data.name) {
        err.textContent = 'Brand and name are both needed.';
        (data.brand ? form.elements.name : form.elements.brand).focus();
        return;
      }
      for (const k of ['fragranticaUrl', 'imageUrl']) {
        if (data[k] && !safeUrl(data[k])) {
          err.textContent = 'Links need to start with https://';
          form.elements[k].focus();
          return;
        }
      }
      const btn = $('[data-save]', dlg);
      btn.disabled = true;
      btn.textContent = 'Saving…';
      try {
        const id = await handlers.save(data, isNew ? undefined : p.id);
        finish(id);
      } catch (ex) {
        console.error(ex);
        err.textContent = friendlyError(ex);
        btn.disabled = false;
        btn.textContent = isNew ? 'Add to journal' : 'Save changes';
      }
    });

    dlg.showModal();
    if (isNew) form.elements.brand.focus();
  });
}

function readForm(form, photo) {
  const f = new FormData(form);
  const s = (k) => String(f.get(k) || '').trim();
  return {
    brand: s('brand'),
    name: s('name'),
    status: s('status') || 'have',
    rating: Number(f.get('rating')) || 0,
    review: s('review'),
    topNotes: toList(s('topNotes')),
    heartNotes: toList(s('heartNotes')),
    baseNotes: toList(s('baseNotes')),
    notes: toList(s('notes')),
    accords: toList(s('accords')),
    season: f.getAll('season').map(String),
    occasion: f.getAll('occasion').map(String),
    longevity: s('longevity'),
    sillage: s('sillage'),
    memories: s('memories'),
    whereBought: s('whereBought'),
    fragranticaUrl: s('fragranticaUrl'),
    imageUrl: s('imageUrl'),
    photo: photo || null,
  };
}

export function friendlyError(err) {
  const code = err?.code || '';
  if (code.includes('permission-denied')) return 'Firebase said no. Make sure you’re signed in as the journal’s owner and the database rules are published (SETUP.md step 6).';
  if (code.includes('unavailable')) return 'You seem to be offline. Try again in a moment.';
  if (code.includes('invalid-argument') || /larger than|exceeds/i.test(err?.message)) return 'That entry is too big to save. Try a smaller photo.';
  return err?.message || 'Something went wrong. Please try again.';
}

function field(name, label, control) {
  return html`<label class="field"><span class="label">${label}</span>${control}</label>`;
}

function select(name, options, value) {
  const opts = value && !options.includes(value) ? [...options, value] : options;
  return html`<select name="${name}"><option value="">-</option>${opts.map((o) => html`<option ${o === value ? raw('selected') : ''}>${o}</option>`)}</select>`;
}

function checks(name, legend, options, values) {
  const all = [...options, ...values.filter((v) => !options.includes(v))];
  return html`<fieldset class="field"><legend>${legend}</legend><div class="toggle-chips">
    ${all.map((o) => html`<label class="toggle"><input type="checkbox" name="${name}" value="${o}" ${values.includes(o) ? raw('checked') : ''}><span>${o}</span></label>`)}
  </div></fieldset>`;
}

/** Cute confirm dialog. Resolves true/false. */
export function confirmDialog({ title, text, ok = 'Yes', cancel = 'Never mind', danger = false }) {
  const dlg = document.getElementById('confirm');
  render(dlg, html`
    <form method="dialog" class="confirm">
      <h2>${title}</h2>
      <p>${text}</p>
      <div class="confirm-actions">
        <button value="cancel" class="btn btn-ghost">${cancel}</button>
        <button value="ok" class="btn ${danger ? 'btn-danger' : ''}">${ok}</button>
      </div>
    </form>`);
  return new Promise((resolve) => {
    dlg.onclose = () => resolve(dlg.returnValue === 'ok');
    dlg.returnValue = '';
    dlg.showModal();
    $('button[value=cancel]', dlg).focus();
  });
}
