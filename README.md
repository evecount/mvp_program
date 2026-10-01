# Mamba Venture Program (MVP)

[![Deploy to GitHub Pages](https://github.com/evecount/mvp_program/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/evecount/mvp_program/actions/workflows/deploy-pages.yml)

**Build a venture that sells.** The Mamba Venture Program helps working professionals, SME owners and aspiring
founders turn industry insight into a working product: validate the problem, build the MVP and test demand.
Run by **Cybrdeck × Mamba Partners**, with **SG Innovation** (powered by Dtmatrix and Keppel) as ecosystem partner.

**Live site:** https://evecount.github.io/mvp_program/

## Site structure

| Page | What it is |
|---|---|
| Landing | Hero, ecosystem, and audience tabs (Founders, Schools, Enterprise, Operators & EIRs, Partners). Only one tab shows at a time. |
| `#apply` | **Apply to MVP**: an 8-step application form. Progress saves in the browser. |

Static HTML/CSS/JS with no build step. Preview locally with:

```bash
python3 -m http.server 8080
```

| File | Purpose |
|---|---|
| `js/application-questions.js` | **The application questions.** Edit here; the form renders from this file. |
| `js/apply.js` | Form logic: steps, validation, draft saving, submission. |
| `js/router.js` | Hash routing (`#apply`, `#section-*`) and audience tabs. |
| `js/firebase-config.js` | Firebase web config (null until the project exists). |
| `firestore.rules` | Database security rules: the public can only *create* a valid application. |
| `assets/brand/` | Cybrdeck, Mamba Partners and SG Innovation logos. |

## Application pipeline (Firebase)

Applications are stored in Firestore, in the `mvp_applications` collection of a Firebase project used only for MVP.
This is separate from Cybrdeck's systems. It runs on the free Spark plan, with no Cloud Functions.

**One-time setup**

1. Create a project at https://console.firebase.google.com (e.g. `mamba-mvp`).
2. **Build → Firestore Database → Create database** (production mode, region `asia-southeast1`).
3. **Project settings → Your apps → Web app**. Register it, then paste the config object into `js/firebase-config.js`.
4. Deploy the security rules:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add            # pick the project
   firebase deploy --only firestore:rules
   ```
5. Optional: under **Authentication → Settings → Authorized domains**, make sure `evecount.github.io` is listed.

**Reviewing applications:** Firebase console → Firestore → `mvp_applications`. Each document holds the contact
details, stage and intake, the 18 partner-interview answers (`q01`–`q18`), `status: "pending"` and `createdAt`.

**Changing questions:** edit `js/application-questions.js`. If you add, remove or rename a field id, or change a
dropdown's options, update `firestore.rules` to match and redeploy the rules. Otherwise submissions are rejected.

## Deployment

Pushing to `main` deploys to GitHub Pages through `.github/workflows/deploy-pages.yml`.

## License

© 2026 Mamba Venture Program. All rights reserved.
