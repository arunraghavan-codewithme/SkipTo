// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// eslint-disable-next-line no-unused-vars
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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
const analytics = getAnalytics(app);

// --- NEW: Initialize Functions ---
const functions = getFunctions(app);

// --- NEW: Emulator wiring for Functions only ---
// Turned off: Windows blocks the local emulator, so we use the live functions.
if (
  window.location.hostname === "localhost" ||
  process.env.REACT_APP_ENV === "local"
) {
  // connectFunctionsEmulator(functions, "localhost", 5001);
}

// Export whatever you need elsewhere
export { app, analytics, functions };