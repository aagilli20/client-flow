import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Si no hay API key configurada la app corre en MODO DEMO (datos en el navegador).
 * Las variables NEXT_PUBLIC_* se inlinean en build: hay que leerlas literalmente.
 */
export const isFirebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

/** Inicialización perezosa: solo se llama cuando isFirebaseConfigured es true. */
export function getFirebase() {
  if (cached) return cached;
  const fresh = getApps().length === 0;
  const app = fresh ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (fresh && useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  cached = { app, auth, db };
  return cached;
}
