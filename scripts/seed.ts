/**
 * Seed de datos de DEMOSTRACIÓN (100% ficticios) en Cloud Firestore con Firebase Admin SDK.
 *
 *   Emuladores:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *                FIREBASE_PROJECT_ID=demo-clientflow npm run seed
 *   Proyecto real: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json FIREBASE_PROJECT_ID=<id> npm run seed
 *
 * Crea (o reutiliza) el usuario demo@clientflow.app / demo1234 y carga su dataset.
 * Es idempotente: los ids de documento son deterministas, re-ejecutarlo no duplica.
 * Las credenciales Admin se usan solo aquí (servidor/CLI), jamás en el navegador.
 */
import { cert, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { buildSeed } from '../src/lib/seed-data';

const DEMO_EMAIL = 'demo@clientflow.app';
const DEMO_PASSWORD = 'demo1234';
const INSTANTS = ['createdAt', 'updatedAt', 'lastActionDate'];

function toFirestore<T extends object>(doc: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v === undefined) continue;
    out[k] = INSTANTS.includes(k) && typeof v === 'string' ? Timestamp.fromDate(new Date(v)) : v;
  }
  return out;
}

async function writeAll(db: Firestore, col: string, docs: { id: string }[]) {
  // batch ≤ 500 operaciones
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const { id, ...rest } of docs.slice(i, i + 400)) batch.set(db.collection(col).doc(id), toFirestore(rest));
    await batch.commit();
  }
  console.log(`  ✓ ${col}: ${docs.length}`);
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Definí FIREBASE_PROJECT_ID (p.ej. demo-clientflow para emuladores).');

  const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  if (!getApps().length) {
    initializeApp({
      projectId,
      // Con emulador no se necesitan credenciales reales.
      ...(usingEmulator ? {} : { credential: process.env.GOOGLE_APPLICATION_CREDENTIALS ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) : applicationDefault() }),
    });
  }
  const auth = getAuth();
  const db = getFirestore();

  let uid: string;
  try {
    uid = (await auth.getUserByEmail(DEMO_EMAIL)).uid;
    console.log(`Usuario demo existente: ${uid}`);
  } catch {
    uid = (await auth.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: 'Carolina Ríos' })).uid;
    console.log(`Usuario demo creado: ${uid}`);
  }

  const seed = buildSeed(uid);
  await db.collection('users').doc(uid).set({ ...seed.settings, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  console.log('  ✓ users: 1');
  await writeAll(db, 'contacts', seed.contacts);
  await writeAll(db, 'team_members', seed.team_members);
  await writeAll(db, 'social_posts', seed.social_posts);
  await writeAll(db, 'focus_metrics', seed.focus_metrics);
  await writeAll(db, 'daily_activities', seed.daily_activities);
  console.log(`\nListo. Entrá con ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
