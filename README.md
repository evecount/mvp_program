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
| `gaseo/` | **GASEO**, the SEO/AEO/GEO agent. It generates each page's search metadata and JSON-LD, plus `robots.txt`, `sitemap.xml` and `llms.txt` (see below). |

## Application pipeline (Firebase)

It is the same form and pipeline as cybrdeck.com's Venture Program (`/venture-program/register`), running in the
`mambaventureprogram` Firebase project instead of Cybrdeck's.

1. The site writes the application to Firestore, collection `mvp_applications`. The rules allow create only.
2. The Cloud Function `onApplicationFiled` (region `asia-southeast1`) picks it up and:
   - re-validates it against the question catalogue (an invalid write gets `rejected` and no email)
   - scores it on the seven readiness axes and screens it against the EnterpriseSG / EDB grants
   - has **One** review that score: One (on Qwen, via Alibaba Model Studio) reads the de-identified application and
     may move each axis by at most 15 points, each move with a cited reason. If One is unavailable, the rule-based
     score stands. The email lists what One moved and why.
   - has the same model draft 3–5 follow-up interview questions, each citing the answers it came from (ungrounded
     or yes/no questions are discarded). They go on the PDF's interview page, labelled as model-written, and never
     change a score.
   - builds the dossier PDF from the blended score: the application as written, then the internal assessment with
     the 3D readiness radar
   - files the PDF in the Mamba shared drive (`DRIVE_FOLDER_ID`). The function's service account,
     `54659970421-compute@developer.gserviceaccount.com`, must be a Content manager on that drive. A failed upload is
     recorded as `driveError` and doesn't stop the emails
   - emails the reviewers (`REVIEWER_EMAILS`) with the PDF attached (no Drive link, so Gmail shows one PDF), and sends the
     applicant a receipt
     (at most one receipt per address per day)
   - writes the score back onto the document (`assessment`, `baselineAssessment`, `oneAssessment`, `interviewDraft`, `driveFileId`, `grantMatches`,
     `processedAt`, any mail error)

**Where the logic comes from:** `functions/src/mamba/` is copied from `cybrdeck-website/src/lib/mamba/`
(`questionnaire.ts`, `program.ts`, `assessment.ts`, `dossierPdf.ts`, `application.ts`, `confirmationEmail.ts`,
`oneAssessment.ts`, `interviewDraft.ts`, `deidentify.ts`, and a Qwen-only `modelLegs.ts`). Keep them in step by
copying over the newer files. Drive filing (`drive.ts`) is a create-only version of cybrdeck's `fileDossier`. The
confirmation email's "change something" line says to reply, since MVP has no revision link.

**Email settings:** `functions/.env` holds the SMTP host, port, sender (`ben@evecount.com`, the same Gmail mailbox
as cybrdeck.com), the reviewer list and One's Model Studio endpoint. The SMTP password and the Model Studio key are
Secret Manager secrets (`SMTP_PASSWORD`, `DASHSCOPE_API_KEY`, copied from the cybrdeck project), set with
`firebase functions:secrets:set <NAME>`.

**Reviewing applications:** the emailed PDF, or Firebase console → Firestore → `mvp_applications`.

**Changing questions:** edit `functions/src/mamba/questionnaire.ts` (or the step layout in
`functions/src/build-form.ts`), then regenerate the form and the rules and deploy everything:

```bash
cd functions && npm install && npm run build:form && cd ..
npx firebase-tools deploy --only hosting,firestore:rules,functions
```

## Search, answer engines and AI (GASEO)

`gaseo/` is the site's headless SEO, AEO and GEO agent. See [gaseo/README.md](gaseo/README.md) for details. In short:

```bash
node gaseo/gaseo.mjs fix     # after changing a page title, description, the FAQ, a cohort, or config
node gaseo/gaseo.mjs check   # what CI runs on every PR
```

Each page's head block, `robots.txt`, `sitemap.xml` and `llms.txt` are generated. Don't edit them by hand.

### When the new domain is connected

1. In the Firebase console, go to Hosting → Add custom domain and finish the DNS steps.
2. Run `node gaseo/gaseo.mjs domain https://<the-domain>`, commit, then deploy hosting.
3. Run `node gaseo/gaseo.mjs live` until every check reads `ok`.
4. In Google Search Console, add a Domain property and submit `https://<the-domain>/sitemap.xml`. Then use Import from
   Google Search Console in Bing Webmaster Tools, which also feeds ChatGPT search and Copilot.
5. Point the Luma events, LinkedIn and other profiles at the new domain, and add those profiles to
   `organization.sameAs` in `gaseo/config.json`.
6. The `web.app` address and the GitHub Pages copy keep serving the site. Every page's canonical tag points search
   engines at the new domain, so they don't compete with it.

## Deployment

The site is hosted on Firebase Hosting at https://mambaventureprogram.web.app. Deploy from the repo root:

```bash
npx firebase-tools login                 # once
npx firebase-tools deploy --only hosting
```

Use `--only hosting,firestore:rules,functions` to deploy the form, the rules and the email pipeline together.

## License

© 2026 Mamba Venture Program. All rights reserved.
