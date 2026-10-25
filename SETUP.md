# Setting up your perfume journal 🌸

This guide walks you through everything, one click at a time. You don't need to know how to code. It takes about **30–45 minutes** the first time, and it's all **free**.

You'll need:
- A **GitHub** account (free, at [github.com](https://github.com))
- A **Google** account (for Firebase, and to sign in to your journal)

Throughout this guide, replace **`USERNAME`** with your GitHub username and **`REPO`** with the name you give your project (for example `perfume-journal`).

---

## Step 1: Put the files on GitHub

1. Sign in at [github.com](https://github.com), click the **+** in the top right corner, then **New repository**.
2. Name it (e.g. `perfume-journal`), choose **Public**, and click **Create repository**.
3. On the next page, click **uploading an existing file**.
4. Drag **all** the project files and folders into the box (including the hidden `.github` folder; on a Mac press <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>.</kbd> in Finder to show hidden files).
5. Click **Commit changes**.

> 💡 If you're comfortable with the GitHub Desktop app, you can use that instead; it handles the hidden folder for you.

## Step 2: Turn on GitHub Pages

1. In your repository, click **Settings**, then **Pages** in the left menu.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Click the **Actions** tab at the top of the repo. You should see "Deploy to GitHub Pages" running. If it isn't running, click it and press **Run workflow**.
4. After a minute or two, your site is live at **`https://USERNAME.github.io/REPO/`** 🎉

Right now it's in **preview mode**, showing a few sample perfumes. The next steps connect it to Firebase so you can save your real journal.

## Step 3: Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with Google.
2. Click **Create a project** (or **Add project**).
3. Give it a name (e.g. `perfume-journal`) and click **Continue**.
4. When asked about Google Analytics, you can turn it **off**. Click **Create project**, then **Continue** when it's ready.

You're on the free **Spark** plan by default. Don't upgrade; nothing here needs a paid plan.

## Step 4: Connect the website to Firebase

1. On your Firebase project's home page, click the **web icon `</>`** ("Add an app to get started"). If you don't see it, click ⚙️ **Project settings**, scroll to **Your apps**, and click `</>`.
2. Give it a nickname (e.g. `journal website`). **Leave "Firebase Hosting" unticked.** Click **Register app**.
3. You'll see a block of code with `const firebaseConfig = { apiKey: "...", ... }`. Keep this page open.
4. In another tab, open your GitHub repository and click the file **`firebase-config.js`**, then the ✏️ **pencil** (Edit) icon.
5. Copy each value from Firebase into the matching line, replacing the `YOUR_...` text. Keep the quote marks. It should end up looking like this (with your own values):

   ```js
   export const firebaseConfig = {
     apiKey: 'AIzaSyB1a2b3c4d5e6f7g8h9...',
     authDomain: 'perfume-journal-1234.firebaseapp.com',
     projectId: 'perfume-journal-1234',
     storageBucket: 'perfume-journal-1234.appspot.com',
     messagingSenderId: '123456789012',
     appId: '1:123456789012:web:abc123def456',
   };
   ```

6. Leave `OWNER_UID` as it is for now. Click **Commit changes**.

> 🔐 **Is it safe to publish these keys?** Yes. Firebase web keys are designed to be public. Your journal is protected by the security rules you'll set up in Step 6, which only let *you* make changes.

## Step 5: Turn on Google sign-in

1. In Firebase, open the left menu: **Build → Authentication**, then click **Get started**.
2. On the **Sign-in method** tab, click **Google**, flip the **Enable** switch, pick your email as the support email, and click **Save**.
3. Now click the **Settings** tab (still in Authentication), then **Authorized domains**.
4. Click **Add domain**, type **`USERNAME.github.io`** (just that, no `https://` and no `/REPO`), and click **Add**.

## Step 6: Create the database and lock it down

1. In Firebase's left menu, go to **Build → Firestore Database**, then **Create database**.
2. Pick a location close to you (you can't change it later, but any choice works). Click **Next**.
3. Choose **Start in production mode** and click **Create**.
4. When it's ready, click the **Rules** tab.
5. Delete everything in the editor. Then open **`firestore.rules`** from your GitHub repo, copy all of it, and paste it into the Firebase editor.
6. Click **Publish**.

The `YOUR_OWNER_UID` placeholder is still in there, so for now nobody can edit (which is fine). You'll fix that next.

## Step 7: Make yourself the owner

Your "UID" is a long ID that Firebase gives your Google account. You need to tell the website and the rules that it belongs to the owner.

**Find your UID** (either way works):
- **Easy way:** wait a minute for GitHub to redeploy after Step 4, then open your site, scroll to the very bottom and click **Owner sign-in ♡**. Sign in with Google. A banner will show **your user ID** with a **Copy** button.
- **Or:** in Firebase, go to **Authentication → Users**. After you've signed in once, you'll see your email with a **User UID** column. Click the copy icon next to it.

**Paste it in two places:**
1. **Website:** in GitHub, edit **`firebase-config.js`** and replace `YOUR_OWNER_UID` with your UID (keep the quotes):
   `export const OWNER_UID = 'aB3dE5fG7hI9jK1lM3nO5pQ7rS9t';`
   Then click **Commit changes**.
2. **Rules:** in Firebase → **Firestore Database → Rules**, find `'YOUR_OWNER_UID'` and replace it with the same UID (keep the quotes). Click **Publish**.
   (Also update `firestore.rules` in GitHub the same way, so your copy stays in sync.)

Wait a minute or two for GitHub to redeploy (check the **Actions** tab for a green tick ✅), then reload your site. When you sign in you'll see the **+ Add perfume** button and a ♡ menu in the top corner. You're the owner now!

## Step 8: Import your 734 perfumes

1. On your site, signed in as the owner, tap the **♡** menu in the top right corner.
2. Choose **Import perfumes.json** and confirm.
3. Watch the progress bar. It takes a few seconds. 🎉

It's **safe to run again** at any time: perfumes that are already in your journal are skipped, so your edits are never overwritten.

---

## Everyday use

- **Add a perfume:** tap **+ Add perfume**. Only brand and name are required.
- **Edit:** tap ✎ on any card, or open a perfume and tap **Edit**. You can change everything, including the name, the brand, the list it's on, and the picture.
- **Photos:** on the add/edit form, tap **📷 Take photo** or **🖼️ Choose photo**. Photos are shrunk automatically. Tap **Remove my photo** to go back to the bottle image.
- **Move between lists:** open a perfume and tap **Move to Collection**, **Mark as Had**, and so on.
- **Delete:** open a perfume, tap **Delete**, then confirm.
- **Backup:** ♡ menu → **Export backup (JSON)** downloads everything to your phone or computer. It's a good idea to do this now and then.

## Troubleshooting

| What you see | What to do |
|---|---|
| Still says "Preview mode" | `firebase-config.js` still has `YOUR_...` values, or GitHub hasn't redeployed yet. Check the **Actions** tab. |
| "This website address isn't authorized" when signing in | Add `USERNAME.github.io` in Firebase → Authentication → Settings → Authorized domains (Step 5). |
| Signed in but no **+ Add perfume** button | `OWNER_UID` in `firebase-config.js` doesn't match your UID exactly. Look for missing characters or extra spaces. |
| "Firebase said no…" when saving | The UID in your Firestore **Rules** doesn't match yet, or you forgot to click **Publish** (Step 7). |
| "Firestore rules are blocking reads" | Re-paste the rules from `firestore.rules` and click **Publish** (Step 6). |
| Sign-in popup doesn't appear on iPhone | Allow pop-ups for the site in Settings → Safari, or try again; it falls back to a full-page sign-in. |
| A bottle image is missing | Some Fragrantica images aren't available. A cute placeholder bottle shows instead. Upload your own photo if you like! |
