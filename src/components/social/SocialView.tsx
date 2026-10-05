'use client';

import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Plus, Share2, Trash2 } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, Field, FormSheet, PageHeader, Skeleton, Spinner } from '@/components/app/shared';
import { useToast } from '@/components/app/Toast';
import { errorText, useCollection, useRepo } from '@/contexts/DataContext';
import { formatDay, formatMonth, monthOf, monthRange, shiftMonth, todayStr } from '@/lib/dates';
import { LABELS, POST_CATEGORIES, socialPostInputSchema, type PostCategory, type SocialPost, type SocialPostInput } from '@/lib/types';

const BADGE: Record<PostCategory, string> = { negocio: 'badge-orange', producto: 'badge-blue', estilo_vida: 'badge-green' };

export default function SocialView() {
  const toast = useToast();
  const repo = useRepo();
  const today = todayStr();
  const [month, setMonth] = useState(monthOf(today));
  const range = monthRange(month);
  const { data, loading, error, reload, create, remove } = useCollection('social_posts', { rangeField: 'date', from: range.from, to: range.to });
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<SocialPost | null>(null);

  const posts = useMemo(() => [...data].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [data]);
  const counts = useMemo(() => {
    const c: Record<PostCategory, number> = { negocio: 0, producto: 0, estilo_vida: 0 };
    data.forEach((p) => (c[p.category] += 1));
    return c;
  }, [data]);

  const save = async (v: SocialPostInput) => {
    try {
      // Si la publicación cae en un mes distinto al visible, se agrega igual pero no aparece en esta vista.
      await create({ ...v, note: v.note || undefined });
      if (v.date === today) await repo.incrementActivity(today, 'posts', 1);
      toast.success('Publicación registrada');
      setAdding(false);
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Social"
        description="Registrá lo que publicás en redes: negocio, producto y estilo de vida."
        actions={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Nueva publicación</button>}
      />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{formatMonth(month)}</h2>
        <div className="flex items-center gap-1">
          <button aria-label="Mes anterior" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="btn-ghost btn-sm w-8 px-0"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Mes siguiente" disabled={month >= monthOf(today)} onClick={() => setMonth((m) => shiftMonth(m, 1))} className="btn-ghost btn-sm w-8 px-0"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <dl className="mb-6 grid grid-cols-3 gap-3">
        {POST_CATEGORIES.map((c) => (
          <div key={c} className="card p-4">
            <dd className="text-2xl font-bold tabular-nums tracking-tight">{loading ? '–' : counts[c]}</dd>
            <dt className="text-xs text-muted-foreground">{LABELS.postCategory[c]}</dt>
          </div>
        ))}
      </dl>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="Sin publicaciones este mes"
          description="Registrá lo que publiques para mantener tu consistencia y cerrar el anillo de Publicaciones."
          action={<button className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Nueva publicación</button>}
        />
      ) : (
        <ul className="card divide-y">
          {posts.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-4">
              <div className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{formatDay(p.date)}</div>
              <span className={BADGE[p.category]}>{LABELS.postCategory[p.category]}</span>
              <p className="min-w-0 flex-1 truncate text-sm">{p.note || <span className="text-muted-foreground">Sin nota</span>}</p>
              <button aria-label="Eliminar publicación" onClick={() => setDeleting(p)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      <FormSheet open={adding} onOpenChange={setAdding} title="Nueva publicación">
        {adding && <PostForm onSubmit={save} onCancel={() => setAdding(false)} />}
      </FormSheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="¿Eliminar publicación?"
        description="Se quitará del registro de este mes."
        onConfirm={async () => {
          try {
            await remove(deleting!.id);
            if (deleting!.date === today) await repo.incrementActivity(today, 'posts', -1);
            toast.success('Publicación eliminada');
          } catch (e) {
            toast.error(errorText(e));
          }
        }}
      />
    </>
  );
}

function PostForm({ onSubmit, onCancel }: { onSubmit: (v: SocialPostInput) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SocialPostInput>({ resolver: zodResolver(socialPostInputSchema), defaultValues: { date: todayStr(), category: 'negocio', note: '' } });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 pb-4">
      <Field label="Fecha" htmlFor="sp-date" error={errors.date?.message}>
        <input id="sp-date" type="date" max={todayStr()} className="input-field" {...register('date')} />
      </Field>
      <Field label="Categoría" htmlFor="sp-cat">
        <select id="sp-cat" className="input-field" {...register('category')}>
          {POST_CATEGORIES.map((c) => <option key={c} value={c}>{LABELS.postCategory[c]}</option>)}
        </select>
      </Field>
      <Field label="Nota" htmlFor="sp-note" error={errors.note?.message} hint="Opcional: de qué trató la publicación.">
        <input id="sp-note" placeholder="Ej. Reel: antes y después" className={`input-field ${errors.note ? 'input-error' : ''}`} {...register('note')} />
      </Field>
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-ghost">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting && <Spinner />} Registrar</button>
      </div>
    </form>
  );
}
