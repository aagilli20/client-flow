'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

const ToastContext = createContext<{ success: (t: string) => void; error: (t: string) => void } | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: ToastItem['kind'], text: string) => {
      const id = ++seq;
      setItems((l) => [...l.slice(-3), { id, kind, text }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = React.useMemo(
    () => ({ success: (t: string) => push('success', t), error: (t: string) => push('error', t) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2',
              t.kind === 'error' ? 'border-red-200 text-red-800' : 'border-gray-200 text-gray-900',
            )}
          >
            {t.kind === 'error' ? (
              <XCircle className="h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
            )}
            <span className="flex-1">{t.text}</span>
            <button aria-label="Cerrar aviso" onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requiere <ToastProvider>');
  return ctx;
}
