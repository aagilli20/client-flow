'use client';

import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, ChevronLeft, ChevronRight, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, Field, FormSheet, PageHeader, ProgressBar, ProgressRing, Skeleton, Spinner } from '@/components/app/shared';
import { useToast } from '@/components/app/Toast';
import { errorText, useCollection } from '@/contexts/DataContext';
import { formatMonth, monthOf, shiftMonth, todayStr } from '@/lib/dates';
import { metricProgress } from '@/lib/metrics';
import { focusMetricInputSchema, type FocusMetric, type FocusMetricInput } from '@/lib/types';

export default function MonthView() {
  const toast = useToast();
  const today = todayStr();
  const [month, setMonth] = useState(monthOf(today));
  const { data, loading, error, reload, create, update, remove } = useCollection('focus_metrics', { rangeField: 'month', from: month, to: month });
  const [editing, setEditing] = useState<FocusMetric | 'new' | null>(null);
  const [deleting, setDeleting] = useState<FocusMetric | null>(null);

  const metrics = useMemo(() => [...data].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'es')), [data]);
  const overall = useMemo(() => {
    const w = data.reduce((s, m) => s + m.weight, 0);
    return w ? Math.round(data.reduce((s, m) => s + metricProgress(m) * m.weight, 0) / w) : 0;
  }, [data]);
  const fail = (e: unknown) => toast.error(errorText(e));

  const save = async (v: FocusMetricInput) => {
    try {
      if (editing && editing !== 'new') {
        await update(editing.id, v);
        toast.success('Métrica actualizada');
      } else {
        await create({ ...v, month });
        toast.success('Métrica creada');
      }
      setEditing(null);
    } catch (e) {
      fail(e);
    }
  };

  const step = async (m: FocusMetric, by: number) => {
    const value = Math.max(0, m.currentValue + by);
    if (value === m.currentValue) return;
    try {
      await update(m.id, { currentValue: value });
    } catch (e) {
      fail(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Mes"
        description="Tus métricas de foco y cuánto te falta para cumplir las metas del mes."
        actions={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Nueva métrica</button>}
      />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{formatMonth(month)}</h2>
        <div className="flex items-center gap-1">
          <button aria-label="Mes anterior" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="btn-ghost btn-sm w-8 px-0"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Mes siguiente" onClick={() => setMonth((m) => shiftMonth(m, 1))} className="btn-ghost btn-sm w-8 px-0"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : metrics.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={`Sin métricas para ${formatMonth(month).toLowerCase()}`}
          description="Definí en qué querés enfocarte este mes y una meta numérica para cada cosa."
          action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Nueva métrica</button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="card flex flex-col items-center justify-center gap-3 p-6 text-center lg:row-span-1" aria-label="Progreso general">
            <ProgressRing percent={overall} color="#f97316" size={132} stroke={12}>
              <span className="text-3xl font-bold tabular-nums">{overall}%</span>
            </ProgressRing>
            <div>
              <h3 className="font-semibold">Progreso del mes</h3>
              <p className="text-xs text-muted-foreground">Ponderado por el peso de cada métrica</p>
            </div>
          </section>

          <ul className="min-w-0 space-y-3 lg:col-span-2">
            {metrics.map((m) => {
              const pct = metricProgress(m);
              return (
                <li key={m.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{m.name}</h3>
                      <p className="text-xs text-muted-foreground">Peso {m.weight}/5</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button aria-label={`Editar ${m.name}`} onClick={() => setEditing(m)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button aria-label={`Eliminar ${m.name}`} onClick={() => setDeleting(m)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar percent={pct} color={pct >= 100 ? 'bg-green-500' : 'bg-orange-500'} />
                    <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">{pct}%</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground"><strong className="text-foreground tabular-nums">{m.currentValue}</strong> de {m.monthlyTarget}</p>
                    <div className="flex items-center gap-1.5">
                      <button aria-label={`Restar ${m.name}`} disabled={m.currentValue === 0} onClick={() => step(m, -1)} className="btn-ghost btn-sm w-8 px-0"><Minus className="h-3.5 w-3.5" /></button>
                      <button aria-label={`Sumar ${m.name}`} onClick={() => step(m, 1)} className="btn-primary btn-sm w-8 px-0"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <FormSheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing && editing !== 'new' ? 'Editar métrica' : 'Nueva métrica'}>
        {editing !== null && <MetricForm key={editing === 'new' ? 'new' : editing.id} metric={editing === 'new' ? undefined : editing} onSubmit={save} onCancel={() => setEditing(null)} />}
      </FormSheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="¿Eliminar métrica?"
        description={`Se eliminará "${deleting?.name ?? ''}" de este mes.`}
        onConfirm={async () => {
          try {
            await remove(deleting!.id);
            toast.success('Métrica eliminada');
          } catch (e) {
            fail(e);
          }
        }}
      />
    </>
  );
}

function MetricForm({ metric, onSubmit, onCancel }: { metric?: FocusMetric; onSubmit: (v: FocusMetricInput) => Promise<void>; onCancel: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FocusMetricInput>({
    resolver: zodResolver(focusMetricInputSchema),
    defaultValues: { name: metric?.name ?? '', monthlyTarget: metric?.monthlyTarget ?? 10, currentValue: metric?.currentValue ?? 0, weight: metric?.weight ?? 3 },
  });
  const cls = (e?: unknown) => `input-field ${e ? 'input-error' : ''}`;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 pb-4">
      <Field label="Nombre" htmlFor="fm-name" error={errors.name?.message}>
        <input id="fm-name" autoFocus placeholder="Ej. Presentaciones realizadas" aria-invalid={!!errors.name} className={cls(errors.name)} {...register('name')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Meta del mes" htmlFor="fm-target" error={errors.monthlyTarget?.message}>
          <input id="fm-target" type="number" inputMode="numeric" min={1} aria-invalid={!!errors.monthlyTarget} className={cls(errors.monthlyTarget)} {...register('monthlyTarget')} />
        </Field>
        <Field label="Valor actual" htmlFor="fm-current" error={errors.currentValue?.message}>
          <input id="fm-current" type="number" inputMode="numeric" min={0} aria-invalid={!!errors.currentValue} className={cls(errors.currentValue)} {...register('currentValue')} />
        </Field>
      </div>
      <Field label="Peso (1–5)" htmlFor="fm-weight" error={errors.weight?.message} hint="Cuánto importa esta métrica en el progreso general.">
        <select id="fm-weight" className="input-field" {...register('weight')}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Field>
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-ghost">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting && <Spinner />} {metric ? 'Guardar cambios' : 'Crear métrica'}</button>
      </div>
    </form>
  );
}
