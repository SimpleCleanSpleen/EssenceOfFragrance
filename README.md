# ✿ Essence of Fragrance

*A personal perfume journal:* a cute, pastel scrapbook of every perfume I own, used to own, want, or want to test. Hosted free on GitHub Pages with Firebase Auth + Firestore, so I can add, edit and photograph perfumes straight from my phone.

> **Setting it up?** Follow **[SETUP.md](SETUP.md)**. It's written for non-technical people, step by step.

## Features

- 💖 **Four lists** with live counts: *In My Collection*, *Used to Own*, *Wishlist*, *To Test* (plus *Everything*)
- 🔍 **Search** across name, brand, notes and accords, plus a **brand filter** and **sorting** (A–Z, brand, rating, recently added)
- ⚡ **Fast with 700+ perfumes**: cards render in pages of 36 with infinite scroll, images lazy-load, and Firestore caches data on the device
- 📖 **Journal page per perfume**: review, memories, top/heart/base notes, accords, season, occasion, longevity and sillage meters, heart rating, where bought, date added, and a Fragrantica link
- ✏️ **Owner-only editing** (Google sign-in): add brand-new perfumes (even ones that aren't on Fragrantica), edit *every* field of *every* perfume, delete with confirmation, and move between lists in one tap
- 📷 **Photos from camera or gallery**, resized to 800px and compressed in the browser (WebP, with JPEG fallback), then stored inline; replace or remove any time
- ☀️ **Perfume of the day**, 📊 **stats page** (counts, top brands, most-loved, favourite notes), cute empty states, and confetti when you add
- ⬇️ **Export** everything to JSON as a backup
- 🧁 **Preview mode**: before Firebase is connected, the site runs on sample perfumes and saves to the browser, so you can try everything

## How it's built

No build step. Plain HTML, CSS and ES modules; the Firebase modular SDK is loaded from Google's CDN only when configured.

```
index.html               App shell
firebase-config.js       Your Firebase web config + OWNER_UID (public by design)
firebase-config.example.js
firestore.rules          Public read, owner-only write, basic validation
css/styles.css           All styles (mobile-first)
js/app.js                State, routing (#/, #/p/<id>, #/stats), actions, import/export
js/views.js              Pure HTML builders for cards, detail, stats
js/form.js               Add/edit dialog + confirm dialog
js/backend.js            Firebase backend and local demo backend (same interface)
js/images.js             The image layer: display, fallback, compression
js/names.js              Tidies slug-damaged names ("Angel s Bread" → "Angel's Bread")
js/samples.js            Sample perfumes shown before the import
data/perfumes.json       734 perfumes converted from the Fragrantica export
tools/convert.py         Rebuilds data/perfumes.json from fragrantica-with-lists.json
.github/workflows/deploy.yml   Publishes to GitHub Pages on every push to main
```

### Data model (`perfumes` collection)

`fragranticaId, brand, name, status, fragranticaUrl, imageUrl, photo, rating, topNotes[], heartNotes[], baseNotes[], accords[], season[], occasion[], longevity, sillage, review, memories, whereBought, createdAt, updatedAt`

It also keeps `originalName` / `originalBrand` (the untidied imported text) and `sourceList` (which Fragrantica list each perfume came from).

- Imported perfumes use their **Fragrantica ID as the document ID**. Manually added ones get `custom-<timestamp>`.
- `status` is one of `have | had | want | testing`.

### The import

`data/perfumes.json` was generated from the Fragrantica export by `tools/convert.py`, which maps each list to a status:

| Fragrantica list | Status |
|---|---|
| Perfumes I Have | `have` |
| Perfumes I Had, Reactions, Sunnydai, Reviews | `had` |
| Perfumes I Want | `want` |
| for test | `testing` |
| Wardrobe | follows its badge (Want → `want`, Have → `have`) |

The in-app **Import** (owner menu) first asks Firestore *on the server* which perfumes already exist, then writes only the missing ones in batches of 450 (Firestore's limit is 500). Re-running it never duplicates or overwrites anything. Names are tidied on import, and the original is kept in `originalName`.

To regenerate the data from a fresh export:

```sh
python3 tools/convert.py fragrantica-with-lists.json data/perfumes.json
```

### Images

Fragrantica bottle images are displayed by URL (`loading="lazy"`, `referrerpolicy="no-referrer"`) and never downloaded or re-hosted. If one fails, a pastel placeholder bottle appears. An owner photo, when present, takes priority.

Photos are stored as base64 data URLs (target ≤ ~135 KB) in the perfume document, well under Firestore's 1 MB limit. **To move photos to Cloudinary later**, only `js/images.js` changes: make `processPhoto()` upload the file and return its URL, and let `photoSrc()` accept `https://` photo URLs.

### Free-tier notes

- The Spark plan allows 50,000 document reads per day. A first-time visitor reads every perfume once (~734 reads), and repeat visits are mostly served from the on-device cache. That's plenty for a personal journal.
- Because photos live inside perfume documents, every photo adds to the first-visit download for new visitors. If you end up uploading hundreds of photos, that's the time to switch to Cloudinary (see above).

## Running locally

Any static server works:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

With placeholder config, the site runs in preview mode (samples and browser storage). To test against real Firebase locally, add `localhost` to Firebase → Authentication → Settings → Authorized domains (it's usually there by default).

## Accessibility

- Text colours meet WCAG AA contrast on their backgrounds (deep plum `#4A2560` body text, `#C2185B` pink text, white on the `#D1247A → #8E44C9` button gradient).
- All images have alt text. Tabs work with arrow keys. Dialogs are native `<dialog>` elements. There's a skip link and visible focus rings.
- Animations (card tilt, sparkles, confetti) are turned off when the device prefers reduced motion.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which copies the site files into `_site/` and publishes them with GitHub's official Pages actions. Turn it on once under **Settings → Pages → Source: GitHub Actions**.

Rules can be published from the Firebase console (see SETUP.md) or with the CLI: `firebase deploy --only firestore:rules`.
