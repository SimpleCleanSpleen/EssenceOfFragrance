import { firebaseConfig, OWNER_UID } from '../firebase-config.js';
import { STATUSES, STATUS_BY_ID, PAGE_SIZE } from './constants.js';
import { html, render, $, debounce, fold, dailyIndex, toast } from './util.js';
import { createBackend, normalize } from './backend.js';
import { SAMPLE_PERFUMES } from './samples.js';
import { installImageFallback } from './images.js';
import { tidyName } from './names.js';
import { confetti } from './confetti.js';
import { openEditor, confirmDialog, friendlyError } from './form.js';
import * as V from './views.js';

const SITE_TITLE = document.title;
const PREFS_KEY = 'perfume-journal-prefs';

const state = {
  backend: null,
  all: [], // perfumes from the backend
  loaded: false,
  user: null,
  isOwner: false,
  tab: 'have',
  q: '',
  brand: '',
  sort: 'name',
  shown: PAGE_SIZE,
  galleryScroll: 0,
  route: { name: 'gallery' },
};

/* ------------------------------------------------------------ helpers */

// Until the real import runs (empty Firestore), show sample perfumes so the site looks lived-in.
const usingSamples = () => state.loaded && state.all.length === 0 && state.backend?.mode === 'firebase';
const perfumes = () => (usingSamples() ? SAMPLE_PERFUMES.map((p) => normalize(p, p.id)) : state.all);
const canEdit = (p) => !(p.sample && state.backend.mode === 'firebase');
const findPerfume = (id) => perfumes().find((p) => p.id === id);

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
    if (p.tab) state.tab = p.tab;
    if (p.sort) state.sort = p.sort;
  } catch {
    /* private mode etc. */
  }
}
function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ tab: state.tab, sort: state.sort }));
  } catch {
    /* ignore */
  }
}

function filtered() {
  const q = fold(state.q.trim());
  let list = perfumes();
  if (state.tab !== 'all') list = list.filter((p) => p.status === state.tab);
  if (state.brand) list = list.filter((p) => p.brand === state.brand);
  if (q) {
    list = list.filter((p) =>
      fold([p.name, p.brand, p.originalName, ...p.accords, ...p.topNotes, ...p.heartNotes, ...p.baseNotes].join(' ')).includes(q),
    );
  }
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  const sorters = {
    name: byName,
    brand: (a, b) => a.brand.localeCompare(b.brand, undefined, { sensitivity: 'base' }) || byName(a, b),
    rating: (a, b) => b.rating - a.rating || byName(a, b),
    recent: (a, b) => (b.createdAt || 0) - (a.createdAt || 0) || byName(a, b),
  };
  return [...list].sort(sorters[state.sort] || byName);
}

/* ------------------------------------------------------------ rendering */

function renderChrome() {
  const owner = state.isOwner;
  document.body.classList.toggle('is-owner', owner);
  $('#fab').hidden = !owner;

  const b = state.backend;
  render($('#auth-area'), owner
    ? html`<details class="menu">
        <summary class="icon-btn" aria-label="Owner menu">♡</summary>
        <div class="menu-pop">
          <p class="menu-who">Signed in${state.user?.displayName ? ` as ${state.user.displayName}` : ''}</p>
          <button class="menu-item" data-action="add">+ Add perfume</button>
          <button class="menu-item" data-action="import">⬆︎ Import perfumes.json</button>
          <button class="menu-item" data-action="export">⬇︎ Export backup (JSON)</button>
          ${b.mode === 'demo' ? html`<button class="menu-item" data-action="reset-demo">↺ Reset demo</button>` : ''}
          <button class="menu-item" data-action="signout">Sign out</button>
        </div>
      </details>`
    : '');

  const banners = [];
  if (b.mode === 'demo') {
    banners.push(html`<div class="banner"><span aria-hidden="true">🧁</span><p><strong>Preview mode.</strong> Changes are saved only on this device. Follow <em>SETUP.md</em> to connect Firebase and make it yours.</p></div>`);
  } else if (state.user && !owner) {
    banners.push(b.ownerConfigured
      ? html`<div class="banner"><span aria-hidden="true">👋</span><p>You’re signed in, but this journal belongs to someone else, so it’s read-only. <button class="link-btn" data-action="signout">Sign out</button></p></div>`
      : html`<div class="banner"><span aria-hidden="true">🔑</span><p><strong>Almost there!</strong> Your user ID is <code>${state.user.uid}</code> <button class="link-btn" data-action="copy-uid">Copy</button>. Paste it as OWNER_UID in <em>firebase-config.js</em> and <em>firestore.rules</em> (see SETUP.md step 7).</p></div>`);
  }
  if (usingSamples()) {
    banners.push(owner
      ? html`<div class="banner banner-pink"><span aria-hidden="true">📦</span><p>Your journal is empty, so you’re seeing sample entries. <button class="btn btn-sm" data-action="import">Import my perfumes</button></p></div>`
      : html`<div class="banner"><span aria-hidden="true">✨</span><p>A few sample perfumes while the journal is being set up.</p></div>`);
  }
  render($('#banners'), banners);

  render($('#footer-auth'), state.user
    ? html`<button class="link-btn" data-action="signout">Sign out</button>`
    : html`<button class="link-btn" data-action="signin">${b.mode === 'demo' ? 'Try owner mode' : 'Owner sign-in'} ♡</button>`);
}

function renderGallery({ resetPage = false } = {}) {
  if (resetPage) state.shown = PAGE_SIZE;
  const all = perfumes();

  const counts = { all: all.length };
  STATUSES.forEach((s) => (counts[s.id] = 0));
  all.forEach((p) => (counts[p.status] = (counts[p.status] || 0) + 1));
  render($('#tabs'), V.tabs(state.tab, counts));

  const inTab = state.tab === 'all' ? all : all.filter((p) => p.status === state.tab);
  const brandCounts = {};
  inTab.forEach((p) => (brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1));
  const brands = Object.entries(brandCounts).sort((a, b) => a[0].localeCompare(b[0]));
  if (state.brand && !brandCounts[state.brand]) state.brand = '';
  render($('#brand'), V.brandOptions(brands, state.brand));
  render($('#sort'), V.sortOptions(state.sort));

  const collection = all.filter((p) => p.status === 'have').sort((a, b) => a.id.localeCompare(b.id));
  render($('#potd'), V.potd(collection[dailyIndex(collection.length)]));

  const list = filtered();
  const isFiltered = Boolean(state.q || state.brand);
  $('#result-count').textContent = state.loaded
    ? `${list.length} ${list.length === 1 ? 'perfume' : 'perfumes'}${isFiltered ? ' found' : ''}`
    : '';

  const grid = $('#grid');
  if (!state.loaded) {
    render(grid, Array.from({ length: 8 }, () => html`<div class="card skeleton" aria-hidden="true"></div>`));
    grid.setAttribute('aria-busy', 'true');
  } else if (!list.length) {
    render(grid, V.emptyState({ tab: state.tab, filtered: isFiltered, isOwner: state.isOwner }));
    grid.removeAttribute('aria-busy');
  } else {
    const opts = { isOwner: state.isOwner };
    render(grid, list.slice(0, state.shown).map((p) => V.card(p, { ...opts, canEdit: canEdit(p) })));
    grid.removeAttribute('aria-busy');
  }
  $('#sentinel').hidden = !state.loaded || state.shown >= list.length;
}

function renderDetail(id) {
  const p = findPerfume(id);
  const el = $('#view-detail');
  if (!p) {
    if (!state.loaded) return render(el, html`<div class="card skeleton detail-skel" aria-hidden="true"></div>`);
    return render(el, html`<div class="empty"><h3>Perfume not found</h3><p>It may have been deleted.</p><a class="btn" href="#/">Back to journal</a></div>`);
  }
  render(el, V.detail(p, { isOwner: state.isOwner, canEdit: canEdit(p) }));
  document.title = `${p.name} · ${SITE_TITLE}`;
}

function renderStats() {
  render($('#view-stats'), V.stats(perfumes()));
  document.title = `Stats · ${SITE_TITLE}`;
}

function renderRoute() {
  const r = state.route;
  $('#view-gallery').hidden = r.name !== 'gallery';
  $('#view-detail').hidden = r.name !== 'detail';
  $('#view-stats').hidden = r.name !== 'stats';
  $$nav();
  if (r.name === 'gallery') {
    document.title = SITE_TITLE;
    renderGallery();
  } else if (r.name === 'detail') renderDetail(r.id);
  else if (r.name === 'stats') renderStats();
}

function $$nav() {
  document.querySelectorAll('.nav a').forEach((a) => {
    const active = (a.dataset.route || 'gallery') === state.route.name;
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function renderAll() {
  renderChrome();
  renderRoute();
  const brands = [...new Set(perfumes().map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
  render($('#brand-list'), brands.map((b) => html`<option value="${b}"></option>`));
}

/* ------------------------------------------------------------ routing */

let lastRouteName = null;
function onRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [name, ...rest] = hash.split('/');
  const prev = state.route.name;
  if (prev === 'gallery') state.galleryScroll = window.scrollY;

  if (name === 'p' && rest.length) state.route = { name: 'detail', id: decodeURIComponent(rest.join('/')) };
  else if (name === 'stats') state.route = { name: 'stats' };
  else state.route = { name: 'gallery' };

  renderRoute();
  if (state.route.name === 'gallery' && prev !== 'gallery' && lastRouteName) {
    window.scrollTo(0, state.galleryScroll);
  } else if (state.route.name !== 'gallery') {
    window.scrollTo(0, 0);
    $('main').focus({ preventScroll: true });
  }
  lastRouteName = state.route.name;
}

/* ------------------------------------------------------------ actions */

async function savePerfume(data, id) {
  const b = state.backend;
  if (id) {
    await b.update(id, data);
    toast('Saved ♡');
    return id;
  }
  const newId = await b.create(data);
  confetti();
  toast(`${data.name} added to your journal ✨`);
  return newId;
}

async function deletePerfume(id) {
  const p = findPerfume(id);
  if (!p) return false;
  const ok = await confirmDialog({
    title: 'Delete this perfume?',
    text: `“${p.name}” by ${p.brand} and its journal entry will be gone for good.`,
    ok: 'Yes, delete',
    danger: true,
  });
  if (!ok) return false;
  try {
    await state.backend.remove(id);
    toast('Deleted');
    if (state.route.name === 'detail' && state.route.id === id) location.hash = '#/';
    return true;
  } catch (err) {
    toast(friendlyError(err));
    return false;
  }
}

const editorHandlers = { save: savePerfume, remove: deletePerfume };

async function addPerfume() {
  const status = state.tab !== 'all' && state.route.name === 'gallery' ? state.tab : 'have';
  const id = await openEditor({ status }, editorHandlers).catch(() => null);
  if (id && id !== 'deleted') location.hash = `#/p/${encodeURIComponent(id)}`;
}

async function editPerfume(id) {
  const p = findPerfume(id);
  if (p) await openEditor(p, editorHandlers);
}

async function movePerfume(id, status) {
  const p = findPerfume(id);
  if (!p || p.status === status) return;
  try {
    await state.backend.update(id, { status });
    toast(`Moved to ${STATUS_BY_ID[status].tab} ${STATUS_BY_ID[status].icon}`);
  } catch (err) {
    toast(friendlyError(err));
  }
}

async function runImport() {
  const ok = await confirmDialog({
    title: 'Import your perfumes?',
    text: 'This adds every perfume from data/perfumes.json. Perfumes already in your journal are skipped, so your edits are safe. You can run it again any time.',
    ok: 'Import',
  });
  if (!ok) return;

  const dlg = $('#progress');
  const show = (title, pct, text) => {
    render(dlg, html`<div class="progress-box"><h2>${title}</h2>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%"></span></div>
      <p aria-live="polite">${text}</p><form method="dialog"><button class="btn" ${pct < 100 ? 'hidden' : ''}>Yay!</button></form></div>`);
  };
  show('Importing… 💫', 2, 'Reading the perfume list…');
  dlg.showModal();
  dlg.oncancel = (e) => e.preventDefault(); // keep it open until done

  try {
    const res = await fetch('data/perfumes.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Couldn't load data/perfumes.json (${res.status})`);
    const rows = await res.json();
    const records = rows
      .filter((r) => r.fragranticaId && r.brand && r.name)
      .map((r) => {
        const id = String(r.fragranticaId).trim();
        return {
          id,
          fragranticaId: id,
          brand: tidyName(r.brand),
          originalBrand: r.brand,
          name: tidyName(r.name),
          originalName: r.name,
          status: STATUS_BY_ID[r.status] ? r.status : 'have',
          fragranticaUrl: r.fragranticaUrl || '',
          imageUrl: r.imageUrl || '',
          sourceList: r.sourceList || '',
        };
      });
    const result = await state.backend.importRecords(records, ({ done, total, skipped }) => {
      const pct = total ? (done / total) * 100 : 100;
      show('Importing… 💫', Math.max(2, Math.min(99, pct)), `${done} of ${total} new perfumes saved${skipped ? ` · ${skipped} already in your journal` : ''}`);
    });
    show('All done! 🎉', 100, `Added ${result.added} perfumes. Skipped ${result.skipped} that were already there.`);
    dlg.oncancel = null;
    if (result.added) confetti(60);
  } catch (err) {
    console.error(err);
    show('Oh no 🥺', 100, `Import stopped: ${friendlyError(err)} Already-saved perfumes are kept; run it again to continue.`);
    dlg.oncancel = null;
  }
}

function exportData() {
  const data = state.all.map(({ sample, ...p }) => p);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `perfume-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${data.length} perfumes`);
}

async function signIn() {
  try {
    await state.backend.signIn();
  } catch (err) {
    console.error(err);
    const msg = err.code === 'auth/unauthorized-domain'
      ? 'This website address isn’t authorized in Firebase yet (SETUP.md step 5).'
      : friendlyError(err);
    toast(msg);
  }
}

const ACTIONS = {
  add: () => addPerfume(),
  edit: (el) => editPerfume(el.dataset.id),
  delete: (el) => deletePerfume(el.dataset.id),
  move: (el) => movePerfume(el.dataset.id, el.dataset.status),
  import: () => runImport(),
  export: () => exportData(),
  signin: () => signIn(),
  signout: () => state.backend.signOut(),
  'reset-demo': async () => {
    if (await confirmDialog({ title: 'Reset the demo?', text: 'This clears everything on this device and brings back the samples.', ok: 'Reset' })) state.backend.resetDemo();
  },
  'copy-uid': () => navigator.clipboard?.writeText(state.user.uid).then(() => toast('Copied!')),
  back: (el, e) => {
    if (history.length > 1 && lastRouteFromGallery) {
      e.preventDefault();
      history.back();
    }
  },
};

let lastRouteFromGallery = false;
window.addEventListener('hashchange', () => {
  lastRouteFromGallery = state.route.name === 'gallery';
});

/* ------------------------------------------------------------ wiring */

function wire() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && ACTIONS[el.dataset.action]) {
      if (el.tagName === 'BUTTON') e.preventDefault();
      el.closest('details.menu')?.removeAttribute('open');
      ACTIONS[el.dataset.action](el, e);
    }
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      state.tab = tab.dataset.tab;
      savePrefs();
      renderGallery({ resetPage: true });
      tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    // Close the owner menu when clicking elsewhere.
    document.querySelectorAll('details.menu[open]').forEach((d) => {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });

  // Arrow keys move between tabs.
  $('#tabs').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = [...$('#tabs').querySelectorAll('[data-tab]')];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next.focus();
    next.click();
  });

  const search = $('#search');
  search.addEventListener('input', debounce(() => {
    state.q = search.value;
    renderGallery({ resetPage: true });
  }, 150));
  $('#brand').addEventListener('change', (e) => {
    state.brand = e.target.value;
    renderGallery({ resetPage: true });
  });
  $('#sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    savePrefs();
    renderGallery({ resetPage: true });
  });

  // Infinite scroll: render the next page when the sentinel comes into view.
  new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting) && state.route.name === 'gallery' && state.loaded) {
      if (state.shown < filtered().length) {
        state.shown += PAGE_SIZE;
        renderGallery();
      }
    }
  }, { rootMargin: '600px' }).observe($('#sentinel'));
  $('#load-more').addEventListener('click', () => {
    state.shown += PAGE_SIZE;
    renderGallery();
  });

  window.addEventListener('hashchange', onRoute);
}

async function main() {
  installImageFallback();
  loadPrefs();
  wire();
  onRoute();

  state.backend = await createBackend(firebaseConfig, OWNER_UID);
  renderChrome();

  state.backend.onAuth(({ user, isOwner }) => {
    state.user = user;
    state.isOwner = isOwner;
    renderAll();
  });

  state.backend.subscribe(
    (list) => {
      state.all = list;
      state.loaded = true;
      renderAll();
    },
    (err) => {
      state.loaded = true;
      renderAll();
      toast(err.code === 'permission-denied' ? 'Firestore rules are blocking reads. See SETUP.md step 6.' : 'Couldn’t load perfumes. Check your connection.');
    },
  );
}

main();
