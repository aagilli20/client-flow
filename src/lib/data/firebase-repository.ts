import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { getFirebase } from '@/lib/firebase/config';
import {
  DEFAULT_SETTINGS,
  type CollectionMap,
  type CollectionName,
  type NewDoc,
  type UserSettings,
} from '@/lib/types';
import { DEFAULT_MAX, type ListOptions, type Repository } from './repository';

/** Campos que en Firestore son Timestamp y en el dominio ISO strings. */
const INSTANT_FIELDS = ['createdAt', 'updatedAt', 'lastActionDate'] as const;

function toDomain<K extends CollectionName>(id: string, data: DocumentData): CollectionMap[K] {
  const out: Record<string, unknown> = { ...data, id };
  for (const f of INSTANT_FIELDS) {
    const v = out[f];
    // createdAt puede ser null un instante tras un write local con serverTimestamp (latency compensation)
    if (v instanceof Timestamp) out[f] = v.toDate().toISOString();
    else if (f !== 'lastActionDate' && v == null) out[f] = new Date().toISOString();
  }
  return out as unknown as CollectionMap[K];
}

function toFirestore(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue; // Firestore rechaza undefined
    out[k] = (INSTANT_FIELDS as readonly string[]).includes(k) && typeof v === 'string' ? Timestamp.fromDate(new Date(v)) : v;
  }
  return out;
}

/**
 * Repositorio sobre Cloud Firestore (colecciones raíz, aisladas por `userId`;
 * ver firestore.rules). Consultas: where(userId) [+ rango] + orderBy + limit.
 * Los índices compuestos necesarios están en firestore.indexes.json.
 */
export function createFirebaseRepository(uid: string): Repository {
  const { db } = getFirebase();

  return {
    async list(col, opts: ListOptions = {}) {
      const c: QueryConstraint[] = [where('userId', '==', uid)];
      if (opts.rangeField && opts.from) c.push(where(opts.rangeField, '>=', opts.from));
      if (opts.rangeField && opts.to) c.push(where(opts.rangeField, '<=', opts.to));
      // Con filtro de rango Firestore exige ordenar primero por ese campo.
      c.push(opts.rangeField ? orderBy(opts.rangeField, 'desc') : orderBy('createdAt', 'desc'));
      c.push(limit(opts.max ?? DEFAULT_MAX));
      const snap = await getDocs(query(collection(db, col), ...c));
      return snap.docs.map((d) => toDomain<typeof col>(d.id, d.data()));
    },

    async create<K extends CollectionName>(col: K, data: NewDoc<K>) {
      const ref = await addDoc(collection(db, col), {
        ...toFirestore(data as Record<string, unknown>),
        userId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const ts = new Date().toISOString();
      return { ...data, id: ref.id, userId: uid, createdAt: ts, updatedAt: ts } as unknown as CollectionMap[K];
    },

    async update(col, id, patch) {
      await updateDoc(doc(db, col, id), { ...toFirestore(patch as Record<string, unknown>), updatedAt: serverTimestamp() });
    },

    async remove(col, id) {
      await deleteDoc(doc(db, col, id));
    },

    async incrementActivity(date, field, by) {
      // id determinista => una única escritura atómica, sin lectura previa.
      await setDoc(
        doc(db, 'daily_activities', `${uid}_${date}`),
        { userId: uid, date, [field]: increment(by), updatedAt: serverTimestamp() },
        { merge: true },
      );
    },

    async getSettings(): Promise<UserSettings> {
      const snap = await getDoc(doc(db, 'users', uid));
      const raw = (snap.data() ?? {}) as Partial<UserSettings>;
      return { ...DEFAULT_SETTINGS, ...raw, goals: { ...DEFAULT_SETTINGS.goals, ...raw.goals } };
    },

    async saveSettings(patch) {
      await setDoc(doc(db, 'users', uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    },
  };
}
