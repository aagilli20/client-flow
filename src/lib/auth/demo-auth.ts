import { clearAll, createLocalRepository, writeRaw } from '@/lib/data/local-repository';
import { buildSeed } from '@/lib/seed-data';
import type { AuthBackend, AuthUser } from './types';

/**
 * Autenticación de MODO DEMO (sin Firebase). Las cuentas viven en localStorage; la
 * contraseña se guarda solo como hash SHA-256 con sal. No es seguridad real: sirve
 * para desarrollar/mostrar la app sin backend. En producción se usa Firebase Auth.
 */
export const DEMO_EMAIL = 'demo@clientflow.app';
export const DEMO_PASSWORD = 'demo1234';

interface Account {
  uid: string;
  email: string;
  name: string;
  salt: string;
  hash: string;
}

const ACCOUNTS_KEY = 'cf:accounts';
const SESSION_KEY = 'cf:session';
const listeners = new Set<(u: AuthUser | null) => void>();

const err = (code: string) => Object.assign(new Error(code), { code });

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const readAccounts = (): Account[] => {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') as Account[];
  } catch {
    return [];
  }
};
const writeAccounts = (a: Account[]) => localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
const toUser = (a: Account): AuthUser => ({ uid: a.uid, email: a.email, displayName: a.name });
const currentUser = () => {
  const uid = localStorage.getItem(SESSION_KEY);
  const acc = readAccounts().find((a) => a.uid === uid);
  return acc ? toUser(acc) : null;
};
const emit = () => {
  const u = currentUser();
  listeners.forEach((cb) => cb(u));
};

async function createAccount(name: string, email: string, password: string, uid = crypto.randomUUID()) {
  const salt = crypto.randomUUID();
  const acc: Account = { uid, email: email.toLowerCase(), name, salt, hash: await sha256(salt + password) };
  writeAccounts([...readAccounts(), acc]);
  return acc;
}

/** Carga el dataset ficticio para una cuenta (usado por la cuenta demo). */
export function seedDemoAccount(uid: string, name: string) {
  const seed = buildSeed(uid);
  clearAll(uid, localStorage);
  writeRaw(uid, localStorage, 'contacts', seed.contacts);
  writeRaw(uid, localStorage, 'team_members', seed.team_members);
  writeRaw(uid, localStorage, 'social_posts', seed.social_posts);
  writeRaw(uid, localStorage, 'focus_metrics', seed.focus_metrics);
  writeRaw(uid, localStorage, 'daily_activities', seed.daily_activities);
  void createLocalRepository(uid, localStorage).saveSettings({ ...seed.settings, displayName: name });
}

export const demoAuthBackend: AuthBackend = {
  mode: 'demo',

  onChange(cb) {
    listeners.add(cb);
    cb(currentUser());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) cb(currentUser());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener('storage', onStorage);
    };
  },

  async signIn(email, password) {
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) throw err('auth/invalid-email');
    let acc = readAccounts().find((a) => a.email === mail);
    // La cuenta demo se crea (con datos ficticios) la primera vez que se usa.
    if (!acc && mail === DEMO_EMAIL && password === DEMO_PASSWORD) {
      acc = await createAccount('Carolina Ríos', DEMO_EMAIL, DEMO_PASSWORD, 'demo-user');
      seedDemoAccount(acc.uid, acc.name);
    }
    const valid = acc ? (await sha256(acc.salt + password)) === acc.hash : false;
    if (!acc || !valid) throw err('auth/invalid-credential');
    localStorage.setItem(SESSION_KEY, acc.uid);
    emit();
  },

  async signUp(name, email, password) {
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) throw err('auth/invalid-email');
    if (password.length < 6) throw err('auth/weak-password');
    if (readAccounts().some((a) => a.email === mail)) throw err('auth/email-already-in-use');
    const acc = await createAccount(name, mail, password);
    void createLocalRepository(acc.uid, localStorage).saveSettings({ displayName: name });
    localStorage.setItem(SESSION_KEY, acc.uid);
    emit();
  },

  async signOut() {
    localStorage.removeItem(SESSION_KEY);
    emit();
  },

  async resetPassword(email) {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw err('auth/invalid-email');
    // En modo demo no hay correo: se simula el envío (respuesta idéntica exista o no la cuenta).
  },
};
