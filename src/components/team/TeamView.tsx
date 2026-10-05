'use client';

import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Pencil, Plus, Trash2, UserPlus, UserCheck } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, Field, FormSheet, PageHeader, ProgressBar, Skeleton, Spinner } from '@/components/app/shared';
import { useToast } from '@/components/app/Toast';
import { errorText, useCollection } from '@/contexts/DataContext';
import { formatDay, todayStr } from '@/lib/dates';
import { buildTeamTree, descendantIds, type TeamNode } from '@/lib/metrics';
import {
  CHECKLIST,
  LABELS,
  MEMBER_STATUSES,
  teamMemberInputSchema,
  type ChecklistKey,
  type TeamMember,
  type TeamMemberInput,
} from '@/lib/types';
import { cn } from '@/lib/utils';

type Editing = { member?: TeamMember; sponsorId?: string | null } | null;

export default function TeamView() {
  const toast = useToast();
  const { data, loading, error, reload, create, update, remove } = useCollection('team_members');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<TeamMember | null>(null);

  const tree = useMemo(() => buildTeamTree(data), [data]);
  const totalVolume = data.reduce((s, m) => s + m.monthlyVolume, 0);
  const shadows = data.filter((m) => m.status === 'shadow').length;
  const fail = (e: unknown) => toast.error(errorText(e));

  const save = async (v: TeamMemberInput) => {
    try {
      if (editing?.member) {
        await update(editing.member.id, v);
        toast.success('Integrante actualizado');
      } else {
        await create({ ...v, checklist: [] });
        toast.success('Integrante agregado');
      }
      setEditing(null);
    } catch (e) {
      fail(e);
    }
  };

  const toggleCheck = async (m: TeamMember, key: ChecklistKey) => {
    const next = m.checklist.includes(key) ? m.checklist.filter((k) => k !== key) : [...m.checklist, key];
    try {
      await update(m.id, { checklist: next });
    } catch (e) {
      fail(e);
    }
  };

  const confirmDelete = async () => {
    const m = deleting!;
    try {
      // Los descendientes directos pasan al sponsor del eliminado: el árbol nunca queda huérfano.
      await Promise.all(data.filter((x) => x.sponsorId === m.id).map((x) => update(x.id, { sponsorId: m.sponsorId })));
      await remove(m.id);
      toast.success('Integrante eliminado');
    } catch (e) {
      fail(e);
    }
  };

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Tu genealogía: reclutas directos, su equipo y el progreso de cada uno."
        actions={
          <button className="btn-primary" onClick={() => setEditing({ sponsorId: null })}>
            <Plus className="h-4 w-4" /> Nuevo integrante
          </button>
        }
      />

      {!loading && !error && data.length > 0 && (
        <dl className="mb-6 grid grid-cols-3 gap-3">
          <Kpi label="Integrantes" value={data.length} />
          <Kpi label="Volumen del equipo" value={totalVolume.toLocaleString('es-AR')} />
          <Kpi label="Nodos sombra" value={shadows} />
        </dl>
      )}

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="space-y-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Todavía no hay integrantes"
          description="Sumá a las personas de tu equipo. Si aún no tienen cuenta, creá un nodo sombra y gestionalo vos."
          action={<button className="btn-primary" onClick={() => setEditing({ sponsorId: null })}><Plus className="h-4 w-4" /> Nuevo integrante</button>}
        />
      ) : (
        <ul className="space-y-3">
          {tree.map((n) => (
            <Node key={n.member.id} node={n} depth={0} onAdd={(id) => setEditing({ sponsorId: id })} onEdit={(m) => setEditing({ member: m })} onDelete={setDeleting} onCheck={toggleCheck} />
          ))}
        </ul>
      )}

      <FormSheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing?.member ? 'Editar integrante' : 'Nuevo integrante'}>
        {editing && <MemberForm key={editing.member?.id ?? `new-${editing.sponsorId}`} editing={editing} all={data} onSubmit={save} onCancel={() => setEditing(null)} />}
      </FormSheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="¿Eliminar integrante?"
        description={`Se eliminará a ${deleting?.name ?? ''}. Las personas que dependen de esta persona pasarán a su sponsor.`}
        onConfirm={confirmDelete}
      />
    </>
  );
}

const Kpi = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="card p-4">
    <dd className="text-2xl font-bold tabular-nums tracking-tight">{value}</dd>
    <dt className="text-xs text-muted-foreground">{label}</dt>
  </div>
);

function Node({ node, depth, onAdd, onEdit, onDelete, onCheck }: {
  node: TeamNode; depth: number;
  onAdd: (sponsorId: string) => void; onEdit: (m: TeamMember) => void; onDelete: (m: TeamMember) => void; onCheck: (m: TeamMember, k: ChecklistKey) => void;
}) {
  const m = node.member;
  const done = m.checklist.length;
  return (
    <li>
      <div className="card p-4">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', m.status === 'shadow' ? 'bg-muted text-muted-foreground' : 'bg-orange-100 text-orange-800')}>
            {m.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{m.name}</h3>
              <span className={m.status === 'shadow' ? 'badge-gray' : 'badge-green'}>{LABELS.memberStatus[m.status]}</span>
            </div>
            <p className="text-xs text-muted-foreground">Desde {formatDay(m.startDate, true)} · Volumen {m.monthlyVolume.toLocaleString('es-AR')}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onAdd(m.id)} className="btn-ghost btn-sm"><UserPlus className="h-3.5 w-3.5" /> Equipo</button>
            <button aria-label={`Editar ${m.name}`} onClick={() => onEdit(m)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-4 w-4" /></button>
            <button aria-label={`Eliminar ${m.name}`} onClick={() => onDelete(m)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>

        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-3 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
            <ProgressBar percent={Math.round((done / CHECKLIST.length) * 100)} className="flex-1" />
            <span className="shrink-0 tabular-nums">{done}/{CHECKLIST.length} pasos</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CHECKLIST.map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={m.checklist.includes(k)} onChange={() => onCheck(m, k)} className="h-4 w-4 rounded border-input accent-orange-500" />
                {LABELS.checklist[k]}
              </label>
            ))}
          </div>
        </details>
      </div>

      {node.children.length > 0 && (
        <ul className="ml-4 mt-3 space-y-3 border-l-2 border-dashed pl-4 sm:ml-6 sm:pl-6">
          {node.children.map((c) => (
            <Node key={c.member.id} node={c} depth={depth + 1} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onCheck={onCheck} />
          ))}
        </ul>
      )}
    </li>
  );
}

function MemberForm({ editing, all, onSubmit, onCancel }: { editing: NonNullable<Editing>; all: TeamMember[]; onSubmit: (v: TeamMemberInput) => Promise<void>; onCancel: () => void }) {
  const m = editing.member;
  const blocked = m ? descendantIds(all, m.id) : new Set<string>();
  const sponsors = all.filter((x) => !blocked.has(x.id));
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeamMemberInput>({
    resolver: zodResolver(teamMemberInputSchema),
    defaultValues: {
      name: m?.name ?? '',
      status: m?.status ?? 'shadow',
      sponsorId: m ? m.sponsorId : (editing.sponsorId ?? null),
      monthlyVolume: m?.monthlyVolume ?? 0,
      startDate: m?.startDate ?? todayStr(),
    },
  });
  const cls = (e?: unknown) => `input-field ${e ? 'input-error' : ''}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 pb-4">
      <Field label="Nombre" htmlFor="tm-name" error={errors.name?.message}>
        <input id="tm-name" autoFocus placeholder="Ej. Paula Domínguez" aria-invalid={!!errors.name} className={cls(errors.name)} {...register('name')} />
      </Field>
      <Field label="Estado" htmlFor="tm-status" hint="Un nodo sombra lo gestionás vos hasta que cree su propia cuenta.">
        <select id="tm-status" className="input-field" {...register('status')}>
          {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{LABELS.memberStatus[s]}</option>)}
        </select>
      </Field>
      <Field label="Sponsor" htmlFor="tm-sponsor">
        <select id="tm-sponsor" className="input-field" {...register('sponsorId', { setValueAs: (v: string) => v || null })}>
          <option value="">Yo (reclutado directo)</option>
          {sponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Volumen del mes" htmlFor="tm-vol" error={errors.monthlyVolume?.message}>
          <input id="tm-vol" type="number" inputMode="numeric" min={0} aria-invalid={!!errors.monthlyVolume} className={cls(errors.monthlyVolume)} {...register('monthlyVolume')} />
        </Field>
        <Field label="Fecha de inicio" htmlFor="tm-start" error={errors.startDate?.message}>
          <input id="tm-start" type="date" aria-invalid={!!errors.startDate} className={cls(errors.startDate)} {...register('startDate')} />
        </Field>
      </div>
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-ghost">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting && <Spinner />} {m ? 'Guardar cambios' : 'Agregar integrante'}</button>
      </div>
    </form>
  );
}
