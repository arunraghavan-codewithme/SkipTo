// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// eslint-disable-next-line no-unused-vars
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// --- App Check: proves requests come from your real website ---
// Started first, so every request after this carries an App Check token.
let appCheck = null;
const recaptchaSiteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

if (recaptchaSiteKey) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  console.warn("REACT_APP_RECAPTCHA_SITE_KEY is missing - App Check is off.");
}

const analytics = getAnalytics(app);

// --- Functions ---
const functions = getFunctions(app);

// --- Emulator wiring for Functions only ---
// Turned off: Windows blocks the local emulator, so we use the live functions.
if (
  window.location.hostname === "localhost" ||
  process.env.REACT_APP_ENV === "local"
) {
  // connectFunctionsEmulator(functions, "localhost", 5001);
}

// --- Auth: sign every visitor in anonymously (no login screen) ---
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Signed in anonymously:", user.uid);
  } else {
    signInAnonymously(auth).catch((err) =>
      console.error("Anonymous sign-in failed:", err)
    );
  }
});

// Call this before calling a Cloud Function, to be sure the visitor is signed in
async function ensureSignedIn() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

// Export whatever you need elsewhere
export { app, analytics, functions, auth, appCheck, ensureSignedIn };