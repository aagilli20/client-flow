import {
  DEFAULT_SETTINGS,
  type ActivityField,
  type CollectionMap,
  type CollectionName,
  type DailyActivity,
  type NewDoc,
  type UserSettings,
} from '@/lib/types';
import { DEFAULT_MAX, type ListOptions, type Repository } from './repository';

/** Almacenamiento mínimo (localStorage en el navegador, Map en tests). */
export interface KVStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStore implements KVStore {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, v);
  removeItem = (k: string) => void this.m.delete(k);
}

const key = (uid: string, col: string) => `cf:${uid}:${col}`;

/** Repositorio de modo demo: persiste en el navegador. Misma semántica que el de Firestore. */
export function createLocalRepository(uid: string, store: KVStore): Repository {
  const read = <K extends CollectionName>(col: K): CollectionMap[K][] => {
    try {
      return JSON.parse(store.getItem(key(uid, col)) ?? '[]') as CollectionMap[K][];
    } catch {
      return [];
    }
  };
  const write = (col: CollectionName, docs: unknown[]) => store.setItem(key(uid, col), JSON.stringify(docs));
  const nowIso = () => new Date().toISOString();

  return {
    async list(col, opts: ListOptions = {}) {
      let docs = read(col) as unknown as Record<string, string>[];
      const f = opts.rangeField;
      if (f && (opts.from || opts.to)) {
        docs = docs.filter((d) => {
          const v = d[f] ?? '';
          return (!opts.from || v >= opts.from) && (!opts.to || v <= opts.to);
        });
      }
      docs = [...docs].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      return docs.slice(0, opts.max ?? DEFAULT_MAX) as unknown as CollectionMap[typeof col][];
    },

    async create<K extends CollectionName>(col: K, data: NewDoc<K>) {
      const ts = nowIso();
      const doc = {
        ...data,
        id: crypto.randomUUID(),
        userId: uid,
        createdAt: ts,
        updatedAt: ts,
      } as unknown as CollectionMap[K];
      write(col, [doc, ...read(col)]);
      return doc;
    },

    async update(col, id, patch) {
      const docs = read(col) as unknown as { id: string }[];
      if (!docs.some((d) => d.id === id)) throw Object.assign(new Error('not-found'), { code: 'not-found' });
      write(col, docs.map((d) => (d.id === id ? { ...d, ...patch, updatedAt: nowIso() } : d)));
    },

    async remove(col, id) {
      write(col, (read(col) as unknown as { id: string }[]).filter((d) => d.id !== id));
    },

    async incrementActivity(date: string, field: ActivityField, by: number) {
      const docs = read('daily_activities');
      const id = `${uid}_${date}`;
      const existing = docs.find((d) => d.id === id);
      const ts = nowIso();
      if (existing) {
        existing[field] = Math.max(0, (existing[field] ?? 0) + by);
        existing.updatedAt = ts;
        write('daily_activities', docs);
      } else {
        const doc: DailyActivity = {
          id,
          userId: uid,
          date,
          conversations: 0,
          followUps: 0,
          posts: 0,
          createdAt: ts,
          updatedAt: ts,
        };
        doc[field] = Math.max(0, by);
        write('daily_activities', [doc, ...docs]);
      }
    },

    async getSettings() {
      try {
        const raw = JSON.parse(store.getItem(key(uid, 'settings')) ?? 'null') as Partial<UserSettings> | null;
        return { ...DEFAULT_SETTINGS, ...raw, goals: { ...DEFAULT_SETTINGS.goals, ...raw?.goals } };
      } catch {
        return DEFAULT_SETTINGS;
      }
    },

    async saveSettings(patch) {
      const cur = await this.getSettings();
      store.setItem(key(uid, 'settings'), JSON.stringify({ ...cur, ...patch, goals: { ...cur.goals, ...patch.goals } }));
    },
  };
}

/** Escribe documentos ya completos (seed). Reemplaza lo existente. */
export function writeRaw(uid: string, store: KVStore, col: string, docs: unknown[]) {
  store.setItem(key(uid, col), JSON.stringify(docs));
}
export function clearAll(uid: string, store: KVStore) {
  for (const c of ['contacts', 'team_members', 'social_posts', 'focus_metrics', 'daily_activities', 'settings']) {
    store.removeItem(key(uid, c));
  }
}
