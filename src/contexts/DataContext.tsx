'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createFirebaseRepository } from '@/lib/data/firebase-repository';
import { createLocalRepository } from '@/lib/data/local-repository';
import type { ListOptions, Repository } from '@/lib/data/repository';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import type { CollectionMap, CollectionName, NewDoc } from '@/lib/types';

const DataContext = createContext<Repository | null>(null);

/** Provee el repositorio del usuario autenticado (Firestore o demo local). */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const repo = useMemo(
    () => (uid ? (isFirebaseConfigured ? createFirebaseRepository(uid) : createLocalRepository(uid, localStorage)) : null),
    [uid],
  );
  return <DataContext.Provider value={repo}>{children}</DataContext.Provider>;
}

export function useRepo() {
  const repo = useContext(DataContext);
  if (!repo) throw new Error('useRepo requiere un usuario autenticado');
  return repo;
}

export interface CollectionState<K extends CollectionName> {
  data: CollectionMap[K][];
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<CollectionMap[K][]>>;
  create: (input: NewDoc<K>) => Promise<CollectionMap[K]>;
  update: (id: string, patch: Partial<NewDoc<K>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
}

/**
 * Lee una colección una vez (sin listeners en tiempo real: costo mínimo de lecturas)
 * y aplica las mutaciones de forma local tras confirmar la escritura, sin releer.
 */
export function useCollection<K extends CollectionName>(col: K, opts?: ListOptions): CollectionState<K> {
  const repo = useRepo();
  const [data, setData] = useState<CollectionMap[K][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const optsKey = JSON.stringify(opts ?? {});
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    repo
      .list(col, optsRef.current)
      .then((rows) => !cancelled && setData(rows))
      .catch((e: unknown) => !cancelled && setError(errorText(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repo, col, optsKey, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const create = useCallback(
    async (input: NewDoc<K>) => {
      const doc = await repo.create(col, input);
      setData((d) => [doc, ...d]);
      return doc;
    },
    [repo, col],
  );
  const update = useCallback(
    async (id: string, patch: Partial<NewDoc<K>>) => {
      await repo.update(col, id, patch);
      setData((d) => d.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)));
    },
    [repo, col],
  );
  const remove = useCallback(
    async (id: string) => {
      await repo.remove(col, id);
      setData((d) => d.filter((x) => x.id !== id));
    },
    [repo, col],
  );
  const removeMany = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => repo.remove(col, id)));
      setData((d) => d.filter((x) => !ids.includes(x.id)));
    },
    [repo, col],
  );

  return { data, loading, error, reload, setData, create, update, remove, removeMany };
}

export function errorText(e: unknown) {
  const code = (e as { code?: string })?.code;
  if (code === 'permission-denied') return 'No tenés permiso para acceder a estos datos.';
  if (code === 'unavailable') return 'No se pudo conectar con el servidor. Reintentá en unos segundos.';
  if (code === 'failed-precondition') return 'Falta un índice de Firestore para esta consulta (ver firestore.indexes.json).';
  return e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
}
