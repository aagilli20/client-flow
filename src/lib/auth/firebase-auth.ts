import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase/config';
import { DEFAULT_SETTINGS } from '@/lib/types';
import type { AuthBackend } from './types';

export const firebaseAuthBackend: AuthBackend = {
  mode: 'firebase',

  onChange(cb) {
    const { auth } = getFirebase();
    return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null));
  },

  async signIn(email, password) {
    await signInWithEmailAndPassword(getFirebase().auth, email, password);
  },

  async signUp(name, email, password) {
    const { auth, db } = getFirebase();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // Perfil de la app (nunca la contraseña: la gestiona Firebase Auth).
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: name,
      sponsorName: '',
      goals: DEFAULT_SETTINGS.goals,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async signOut() {
    await signOut(getFirebase().auth);
  },

  async resetPassword(email) {
    await sendPasswordResetEmail(getFirebase().auth, email);
  },
};
