import type {
  ActivityField,
  CollectionMap,
  CollectionName,
  NewDoc,
  UserSettings,
} from '@/lib/types';

export interface ListOptions {
  /** Campo de rango (p.ej. 'date'). Con `from`/`to` inclusivos. */
  rangeField?: 'date' | 'month';
  from?: string;
  to?: string;
  max?: number;
}

/**
 * Contrato de acceso a datos. Todas las operaciones están acotadas al usuario
 * autenticado (el `userId` se fija en la implementación, nunca lo manda la UI).
 */
export interface Repository {
  list<K extends CollectionName>(col: K, opts?: ListOptions): Promise<CollectionMap[K][]>;
  create<K extends CollectionName>(col: K, data: NewDoc<K>): Promise<CollectionMap[K]>;
  update<K extends CollectionName>(col: K, id: string, patch: Partial<NewDoc<K>>): Promise<void>;
  remove<K extends CollectionName>(col: K, id: string): Promise<void>;
  incrementActivity(date: string, field: ActivityField, by: number): Promise<void>;
  getSettings(): Promise<UserSettings>;
  saveSettings(patch: Partial<UserSettings>): Promise<void>;
}

export const DEFAULT_MAX = 500;
