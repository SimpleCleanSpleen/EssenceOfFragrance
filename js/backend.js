// Data + auth layer. Two interchangeable backends with the same shape:
//   - Firebase (Auth + Firestore) once firebase-config.js is filled in
//   - a local demo (browser storage) so the site works before setup
//
// backend = {
//   mode, isConfigured,
//   subscribe(cb) -> unsubscribe     cb(perfumes[]) on every change
//   onAuth(cb)                        cb({ user, isOwner })
//   signIn(), signOut()
//   create(data) -> id, update(id, data), remove(id)
//   importRecords(records, onProgress) -> { added, skipped }
// }

import { EMPTY_PERFUME } from './constants.js';
import { SAMPLE_PERFUMES } from './samples.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

export function normalize(raw, id) {
  const p = { ...EMPTY_PERFUME, ...raw, id };
  for (const k of ['topNotes', 'heartNotes', 'baseNotes', 'accords', 'season', 'occasion']) {
    if (!Array.isArray(p[k])) p[k] = [];
  }
  p.rating = Math.max(0, Math.min(5, Number(p.rating) || 0));
  p.createdAt = toMillis(p.createdAt);
  p.updatedAt = toMillis(p.updatedAt);
  return p;
}

function toMillis(v) {
  if (!v) return null;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

export function customId() {
  return `custom-${Date.now()}`;
}

function isConfigured(config) {
  return Boolean(config?.apiKey && !config.apiKey.startsWith('YOUR_') && config.projectId);
}

export async function createBackend(config, ownerUid) {
  if (isConfigured(config)) {
    try {
      return await firebaseBackend(config, ownerUid);
    } catch (err) {
      console.error('Firebase failed to start, falling back to demo mode', err);
    }
  }
  return localBackend();
}

/* ---------------------------------------------------------------- Firebase */

async function firebaseBackend(config, ownerUid) {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);

  const app = initializeApp(config);
  let db;
  try {
    // Cache documents on the device so repeat visits are instant and cost fewer reads.
    db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
    });
  } catch {
    db = fs.getFirestore(app);
  }
  const authInst = auth.getAuth(app);
  const col = fs.collection(db, 'perfumes');
  const ownerConfigured = Boolean(ownerUid && !ownerUid.startsWith('YOUR_'));

  const stamp = (data) => ({ ...data, updatedAt: fs.serverTimestamp() });

  return {
    mode: 'firebase',
    isConfigured: true,
    ownerConfigured,

    subscribe(cb, onError) {
      return fs.onSnapshot(
        col,
        (snap) => cb(snap.docs.map((d) => normalize(d.data({ serverTimestamps: 'estimate' }), d.id))),
        (err) => {
          console.error(err);
          onError?.(err);
        },
      );
    },

    onAuth(cb) {
      auth.getRedirectResult(authInst).catch(() => {});
      return auth.onAuthStateChanged(authInst, (user) => {
        cb({ user, isOwner: Boolean(user && ownerConfigured && user.uid === ownerUid) });
      });
    },

    async signIn() {
      const provider = new auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await auth.signInWithPopup(authInst, provider);
      } catch (err) {
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
          await auth.signInWithRedirect(authInst, provider);
        } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          throw err;
        }
      }
    },

    signOut: () => auth.signOut(authInst),

    async create(data) {
      const id = customId();
      await fs.setDoc(fs.doc(col, id), stamp({ ...EMPTY_PERFUME, fragranticaId: id, ...strip(data), createdAt: fs.serverTimestamp() }));
      return id;
    },

    async update(id, data) {
      await fs.setDoc(fs.doc(col, id), stamp(strip(data)), { merge: true });
    },

    async remove(id) {
      await fs.deleteDoc(fs.doc(col, id));
    },

    async importRecords(records, onProgress) {
      // Ask the server (not the cache) which perfumes already exist; those are never touched.
      const existing = new Set((await fs.getDocsFromServer(col)).docs.map((d) => d.id));
      const todo = records.filter((r) => !existing.has(r.id));
      const skipped = records.length - todo.length;
      onProgress({ done: 0, total: todo.length, skipped });
      const BATCH = 450; // Firestore allows 500 writes per batch
      let done = 0;
      for (let i = 0; i < todo.length; i += BATCH) {
        const batch = fs.writeBatch(db);
        for (const r of todo.slice(i, i + BATCH)) {
          const { id, ...data } = r;
          batch.set(fs.doc(col, id), {
            ...EMPTY_PERFUME,
            ...data,
            createdAt: fs.serverTimestamp(),
            updatedAt: fs.serverTimestamp(),
          });
        }
        await batch.commit();
        done = Math.min(todo.length, i + BATCH);
        onProgress({ done, total: todo.length, skipped });
      }
      return { added: todo.length, skipped };
    },
  };
}

// Fields that only exist client-side and must never be written.
function strip(data) {
  const { id, sample, createdAt, updatedAt, ...rest } = data;
  return rest;
}

/* ------------------------------------------------------------ Local demo */

const LS_KEY = 'perfume-journal-demo-v1';
const LS_OWNER = 'perfume-journal-demo-owner';

function localBackend() {
  let docs = load();
  const listeners = new Set();
  const authListeners = new Set();
  let owner = readOwner();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch {
      /* ignore */
    }
    return Object.fromEntries(SAMPLE_PERFUMES.map(({ id, ...p }) => [id, p]));
  }
  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(docs));
    } catch (err) {
      console.warn('Demo storage is full; changes last until you reload.', err);
    }
  }
  function readOwner() {
    try {
      return localStorage.getItem(LS_OWNER) === '1';
    } catch {
      return false;
    }
  }
  const emit = () => {
    const list = Object.entries(docs).map(([id, p]) => normalize(p, id));
    listeners.forEach((cb) => cb(list));
  };
  const emitAuth = () => {
    const user = owner ? { uid: 'demo-owner', displayName: 'Demo owner' } : null;
    authListeners.forEach((cb) => cb({ user, isOwner: owner }));
  };
  const setOwner = (v) => {
    owner = v;
    try {
      localStorage.setItem(LS_OWNER, v ? '1' : '0');
    } catch {
      /* ignore */
    }
    emitAuth();
  };

  return {
    mode: 'demo',
    isConfigured: false,
    ownerConfigured: true,
    subscribe(cb) {
      listeners.add(cb);
      queueMicrotask(emit);
      return () => listeners.delete(cb);
    },
    onAuth(cb) {
      authListeners.add(cb);
      queueMicrotask(emitAuth);
      return () => authListeners.delete(cb);
    },
    async signIn() {
      setOwner(true);
    },
    async signOut() {
      setOwner(false);
    },
    async create(data) {
      const id = customId();
      docs[id] = { ...EMPTY_PERFUME, fragranticaId: id, ...strip(data), createdAt: Date.now(), updatedAt: Date.now() };
      save();
      emit();
      return id;
    },
    async update(id, data) {
      docs[id] = { ...docs[id], ...strip(data), updatedAt: Date.now() };
      save();
      emit();
    },
    async remove(id) {
      delete docs[id];
      save();
      emit();
    },
    async importRecords(records, onProgress) {
      // Sample entries are placeholders; the import replaces them with the real list.
      for (const [id, p] of Object.entries(docs)) if (p.sample) delete docs[id];
      const todo = records.filter((r) => !docs[r.id]);
      const skipped = records.length - todo.length;
      const t = Date.now();
      todo.forEach(({ id, ...data }) => {
        docs[id] = { ...EMPTY_PERFUME, ...data, createdAt: t, updatedAt: t };
      });
      onProgress({ done: todo.length, total: todo.length, skipped });
      save();
      emit();
      return { added: todo.length, skipped };
    },
    resetDemo() {
      docs = Object.fromEntries(SAMPLE_PERFUMES.map(({ id, ...p }) => [id, p]));
      save();
      emit();
    },
  };
}
