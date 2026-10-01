/**
 * Firebase web config for the Mamba MVP application pipeline.
 *
 * From Firebase console → Project settings → Your apps → Web app. These values
 * are public identifiers, not secrets: access is controlled by firestore.rules,
 * which only allows creating an application.
 *
 * Set this to null to close applications: the form still works end to end but
 * cannot submit; it tells the applicant applications are not open yet and keeps
 * their draft.
 */
window.MVP_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDHGFMh3Xr7qtO-0DFJPIRJIZbyiR--1xg",
  authDomain: "mambaventureprogram.firebaseapp.com",
  projectId: "mambaventureprogram",
  storageBucket: "mambaventureprogram.firebasestorage.app",
  messagingSenderId: "54659970421",
  appId: "1:54659970421:web:2494b1bbd39be056fc8f3c",
  measurementId: "G-1XELHRBW7J",
};
