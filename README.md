# Mamba Venture Program (MVP)


**Build a venture that sells.** The Mamba Venture Program helps working professionals, SME owners and aspiring
founders turn industry insight into a working product: validate the problem, build the MVP and test demand.
Run by **Cybrdeck × Mamba Partners**, with **SG Innovation** (powered by Dtmatrix and Keppel) as ecosystem partner.

**Live site:** https://mambaventureprogram.web.app

## Site structure

| Page | What it is |
|---|---|
| Landing | Hero, ecosystem, and audience tabs (Founders, Schools, Enterprise, Operators & EIRs, Partners). Only one tab shows at a time. |
| `#apply` | **Apply to MVP**: the Mamba Venture Program application, up to 10 steps (founders get one extra). Progress saves in the browser. |

Static HTML/CSS/JS with no build step. Preview locally with:

```bash
python3 -m http.server 8080
```

| File | Purpose |
|---|---|
| `js/application-questions.js` | The form's steps and questions. **Generated** from `functions/src/mamba/` (see below), do not edit. |
| `js/apply.js` | Form logic: steps, validation, draft saving, submission. |
| `js/router.js` | Hash routing (`#apply`, `#section-*`) and audience tabs. |
| `js/firebase-config.js` | Firebase web config for `mambaventureprogram`. |
| `firestore.rules` | Database security rules: the public can only *create* a valid application. **Generated**, like the form. |
| `functions/` | The Cloud Function that scores each application, builds the dossier PDF and sends the emails. |
| `assets/brand/` | Cybrdeck, Mamba Partners and SG Innovation logos. |

## Application pipeline (Firebase)

It is the same form and pipeline as cybrdeck.com's Venture Program (`/venture-program/register`), running in the
`mambaventureprogram` Firebase project instead of Cybrdeck's.

1. The site writes the application to Firestore, collection `mvp_applications`. The rules allow create only.
2. The Cloud Function `onApplicationFiled` (region `asia-southeast1`) picks it up and:
   - re-validates it against the question catalogue (an invalid write gets `rejected` and no email)
   - scores it on the seven readiness axes and screens it against the EnterpriseSG / EDB grants
   - builds the dossier PDF: the application as written, then the internal assessment with the 3D readiness radar
   - emails the reviewers (`REVIEWER_EMAILS`) with the PDF attached, and sends the applicant a receipt
     (at most one receipt per address per day)
   - writes the score back onto the document (`assessment`, `grantMatches`, `processedAt`, any mail error)

**Where the logic comes from:** `functions/src/mamba/` is copied from `cybrdeck-website/src/lib/mamba/`
(`questionnaire.ts`, `program.ts`, `assessment.ts`, `dossierPdf.ts`, `application.ts`, `confirmationEmail.ts`). Keep
them in step by copying over the newer files. Not ported: the AI review passes and Google Drive filing. The
confirmation email's "change something" line says to reply, since MVP has no revision link.

**Email settings:** `functions/.env` holds the SMTP host, port, sender (`ben@evecount.com`, the same Gmail mailbox
as cybrdeck.com) and the reviewer list. The password is a Secret Manager secret, set with
`firebase functions:secrets:set SMTP_PASSWORD`.

**Reviewing applications:** the emailed PDF, or Firebase console → Firestore → `mvp_applications`.

**Changing questions:** edit `functions/src/mamba/questionnaire.ts` (or the step layout in
`functions/src/build-form.ts`), then regenerate the form and the rules and deploy everything:

```bash
cd functions && npm install && npm run build:form && cd ..
npx firebase-tools deploy --only hosting,firestore:rules,functions
```

## Deployment

The site is hosted on Firebase Hosting at https://mambaventureprogram.web.app. Deploy from the repo root:

```bash
npx firebase-tools login                 # once
npx firebase-tools deploy --only hosting
```

Use `--only hosting,firestore:rules,functions` to deploy the form, the rules and the email pipeline together.

## License

© 2026 Mamba Venture Program. All rights reserved.
