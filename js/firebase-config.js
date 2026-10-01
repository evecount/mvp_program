/**
 * Firebase web config for the Mamba MVP application pipeline.
 *
 * Paste the config object from Firebase console → Project settings → Your apps
 * → Web app. These values are public identifiers, not secrets: access is
 * controlled by firestore.rules, which only allows creating an application.
 *
 * While this is null, the form still works end to end but cannot submit; it
 * tells the applicant applications are not open yet and keeps their draft.
 */
window.MVP_FIREBASE_CONFIG = null;
/* Example:
window.MVP_FIREBASE_CONFIG = {
  apiKey: "…",
  authDomain: "mamba-mvp.firebaseapp.com",
  projectId: "mamba-mvp",
  appId: "…",
};
*/
