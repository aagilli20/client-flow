/**
 * Tests de Firestore Security Rules. Requieren el emulador de Firestore (necesita Java):
 *   npm run test:rules
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const contact = (uid: string, over: Record<string, unknown> = {}) => ({
  userId: uid, name: 'Ana Pérez', category: 'negocio', temperature: 'tibio', stage: 'conversacion', result: 'abierto',
  followUpsCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-clientflow',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const as = (uid: string) => env.authenticatedContext(uid).firestore();

describe('autenticación', () => {
  it('un usuario anónimo no puede leer ni escribir nada', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'contacts/x')));
    await assertFails(setDoc(doc(db, 'contacts/x'), contact('alice')));
  });
});

describe('contacts: CRUD del dueño', () => {
  it('crea, lee, edita y elimina lo propio', async () => {
    const db = as('alice');
    await assertSucceeds(setDoc(doc(db, 'contacts/c1'), contact('alice')));
    await assertSucceeds(getDoc(doc(db, 'contacts/c1')));
    await assertSucceeds(updateDoc(doc(db, 'contacts/c1'), { temperature: 'caliente', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db, 'contacts/c1')));
  });

  it('no puede crear un documento a nombre de otro usuario', async () => {
    await assertFails(setDoc(doc(as('alice'), 'contacts/c1'), contact('bob')));
  });

  it('valida campos: enum inválido y nombre largo', async () => {
    const db = as('alice');
    await assertFails(setDoc(doc(db, 'contacts/c1'), contact('alice', { temperature: 'hirviendo' })));
    await assertFails(setDoc(doc(db, 'contacts/c2'), contact('alice', { name: 'x'.repeat(81) })));
  });
});

describe('aislamiento entre usuarios', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'contacts/bobs'), contact('bob'));
      await setDoc(doc(ctx.firestore(), 'contacts/alices'), contact('alice'));
    });
  });

  it('no lee, edita ni borra documentos ajenos', async () => {
    const db = as('alice');
    await assertFails(getDoc(doc(db, 'contacts/bobs')));
    await assertFails(updateDoc(doc(db, 'contacts/bobs'), { name: 'Hackeado' }));
    await assertFails(deleteDoc(doc(db, 'contacts/bobs')));
  });

  it('una query acotada a su userId funciona; una sin filtro o ajena falla', async () => {
    const db = as('alice');
    await assertSucceeds(getDocs(query(collection(db, 'contacts'), where('userId', '==', 'alice'))));
    await assertFails(getDocs(query(collection(db, 'contacts'), where('userId', '==', 'bob'))));
    await assertFails(getDocs(collection(db, 'contacts')));
  });

  it('no puede cambiar el userId ni createdAt de un documento propio', async () => {
    const db = as('alice');
    await assertFails(updateDoc(doc(db, 'contacts/alices'), { userId: 'bob' }));
    await assertFails(updateDoc(doc(db, 'contacts/alices'), { createdAt: new Date(0) }));
  });
});

describe('daily_activities', () => {
  it('permite el increment con id determinista uid_fecha', async () => {
    const db = as('alice');
    await assertSucceeds(setDoc(doc(db, 'daily_activities/alice_2026-10-04'), { userId: 'alice', date: '2026-10-04', followUps: increment(1), updatedAt: serverTimestamp() }, { merge: true }));
  });
  it('rechaza ids que no corresponden al usuario/fecha', async () => {
    const db = as('alice');
    await assertFails(setDoc(doc(db, 'daily_activities/bob_2026-10-04'), { userId: 'alice', date: '2026-10-04', followUps: 1 }));
    await assertFails(setDoc(doc(db, 'daily_activities/alice_2026-10-05'), { userId: 'alice', date: '2026-10-04', followUps: 1 }));
  });
});

describe('users y colecciones no declaradas', () => {
  it('solo el propio usuario accede a su perfil, y solo con campos permitidos', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'users/alice'), { displayName: 'Alice', goals: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(as('bob'), 'users/alice')));
    await assertFails(setDoc(doc(as('alice'), 'users/alice'), { displayName: 'Alice', isAdmin: true }));
  });
  it('colecciones desconocidas están denegadas', async () => {
    await assertFails(setDoc(doc(as('alice'), 'secretos/1'), { a: 1 }));
  });
});

describe('métricas y equipo: límites numéricos', () => {
  it('rechaza peso fuera de 1-5 y volumen negativo', async () => {
    const db = as('alice');
    const base = { userId: 'alice', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(db, 'focus_metrics/m1'), { ...base, name: 'Meta', monthlyTarget: 10, currentValue: 0, weight: 9, month: '2026-10' }));
    await assertFails(setDoc(doc(db, 'team_members/t1'), { ...base, name: 'Paula', status: 'shadow', monthlyVolume: -1 }));
    await assertSucceeds(setDoc(doc(db, 'team_members/t2'), { ...base, name: 'Paula', status: 'shadow', monthlyVolume: 10 }));
  });
});
