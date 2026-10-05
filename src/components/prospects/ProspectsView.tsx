'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, MessageCircle, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { ConfirmDialog, EmptyState, ErrorState, FormSheet, PageHeader, Skeleton } from '@/components/app/shared';
import { useToast } from '@/components/app/Toast';
import { errorText, useCollection, useRepo } from '@/contexts/DataContext';
import { relativeDay, todayStr } from '@/lib/dates';
import { isStalled } from '@/lib/metrics';
import {
  CATEGORIES,
  LABELS,
  STAGES,
  TEMPERATURES,
  type Contact,
  type ContactInput,
  type Temperature,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import ProspectForm from './ProspectForm';

const PAGE_SIZE = 10;
type StatusFilter = 'all' | 'open' | 'stalled' | 'closed';
type Sort = 'recent' | 'name' | 'next';

const TEMP_BADGE: Record<Temperature, string> = { frio: 'badge-blue', tibio: 'badge-yellow', caliente: 'badge-red' };

export default function ProspectsView() {
  const params = useSearchParams();
  const toast = useToast();
  const repo = useRepo();
  const { data, loading, error, reload, create, update, remove, removeMany } = useCollection('contacts');

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [temperature, setTemperature] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState<StatusFilter>(params.get('filter') === 'stalled' ? 'stalled' : 'all');
  const [sort, setSort] = useState<Sort>('recent');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Contact | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);

  const today = todayStr();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = data.filter((c) => {
      if (term && !`${c.name} ${c.notes ?? ''} ${c.contactMethod ?? ''}`.toLowerCase().includes(term)) return false;
      if (category && c.category !== category) return false;
      if (temperature && c.temperature !== temperature) return false;
      if (stage && c.stage !== stage) return false;
      if (status === 'open' && c.result !== 'abierto') return false;
      if (status === 'closed' && c.result === 'abierto') return false;
      if (status === 'stalled' && !isStalled(c, today)) return false;
      return true;
    });
    return rows.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'es');
      if (sort === 'next') return (a.nextActionDate || '9999').localeCompare(b.nextActionDate || '9999');
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [data, q, category, temperature, stage, status, sort, today]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const stalledCount = useMemo(() => data.filter((c) => isStalled(c, today)).length, [data, today]);
  const hasFilters = !!(q || category || temperature || stage || status !== 'all');

  const resetFilters = () => {
    setQ(''); setCategory(''); setTemperature(''); setStage(''); setStatus('all'); setPage(1);
  };

  const fail = (e: unknown) => toast.error(errorText(e));

  const toPayload = (v: ContactInput) => ({
    ...v,
    contactMethod: v.contactMethod || undefined,
    notes: v.notes || undefined,
    nextAction: v.nextAction || undefined,
    nextActionDate: v.nextActionDate || '',
  });

  const save = async (v: ContactInput) => {
    try {
      if (editing && editing !== 'new') {
        await update(editing.id, toPayload(v));
        toast.success('Prospecto actualizado');
      } else {
        await create({ ...toPayload(v), followUpsCount: 0, lastActionDate: new Date().toISOString() });
        await repo.incrementActivity(today, 'conversations', 1);
        toast.success('Prospecto creado');
      }
      setEditing(null);
    } catch (e) {
      fail(e);
    }
  };

  const followUp = async (c: Contact) => {
    try {
      await update(c.id, {
        followUpsCount: c.followUpsCount + 1,
        lastActionDate: new Date().toISOString(),
        // el seguimiento cumple la acción agendada vencida
        ...(c.nextActionDate && c.nextActionDate <= today ? { nextActionDate: '', nextAction: undefined } : {}),
      });
      await repo.incrementActivity(today, 'followUps', 1);
      toast.success(`Seguimiento registrado con ${c.name}`);
    } catch (e) {
      fail(e);
    }
  };

  const bulkTemperature = async (t: Temperature) => {
    try {
      await Promise.all([...selected].map((id) => update(id, { temperature: t })));
      toast.success(`${selected.size} prospectos marcados como ${LABELS.temperature[t].toLowerCase()}`);
      setSelected(new Set());
    } catch (e) {
      fail(e);
    }
  };

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      rows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id)));
      return n;
    });

  return (
    <>
      <PageHeader
        title="Prospectos"
        description="Tu embudo de contactos: quién es cada persona, en qué etapa está y cuándo seguirla."
        actions={
          <button className="btn-primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> Nuevo prospecto
          </button>
        }
      />

      {stalledCount > 0 && status !== 'stalled' && (
        <button
          onClick={() => { setStatus('stalled'); setPage(1); }}
          className="mb-4 flex w-full items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-left text-sm text-yellow-900 hover:bg-yellow-100"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{stalledCount}</strong> {stalledCount === 1 ? 'prospecto parado necesita' : 'prospectos parados necesitan'} seguimiento. Ver →</span>
        </button>
      )}

      {/* Filtros */}
      <div className="card mb-4 flex flex-col gap-3 p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Buscar prospectos"
            placeholder="Buscar por nombre, notas o medio…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Select label="Estado" value={status} onChange={(v) => { setStatus(v as StatusFilter); setPage(1); }}
            options={[['all', 'Todos'], ['open', 'Abiertos'], ['stalled', 'Parados'], ['closed', 'Cerrados']]} />
          <Select label="Categoría" value={category} onChange={(v) => { setCategory(v); setPage(1); }}
            options={[['', 'Todas'], ...CATEGORIES.map((c) => [c, LABELS.category[c]] as [string, string])]} />
          <Select label="Temperatura" value={temperature} onChange={(v) => { setTemperature(v); setPage(1); }}
            options={[['', 'Todas'], ...TEMPERATURES.map((c) => [c, LABELS.temperature[c]] as [string, string])]} />
          <Select label="Etapa" value={stage} onChange={(v) => { setStage(v); setPage(1); }}
            options={[['', 'Todas'], ...STAGES.map((c) => [c, LABELS.stage[c]] as [string, string])]} />
          <Select label="Ordenar por" value={sort} onChange={(v) => setSort(v as Sort)}
            options={[['recent', 'Más recientes'], ['name', 'Nombre (A-Z)'], ['next', 'Próximo seguimiento']]} />
        </div>
      </div>

      {/* Acciones masivas */}
      {selected.size > 0 && (
        <div role="region" aria-label="Acciones masivas" className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <span className="mr-auto font-medium">{selected.size} seleccionados</span>
          {TEMPERATURES.map((t) => (
            <button key={t} onClick={() => bulkTemperature(t)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
              Marcar {LABELS.temperature[t].toLowerCase()}
            </button>
          ))}
          <button onClick={() => setBulkDelete(true)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium hover:bg-red-600">
            Eliminar
          </button>
          <button onClick={() => setSelected(new Set())} className="px-2 text-xs underline-offset-2 hover:underline">
            Cancelar
          </button>
        </div>
      )}

      {/* Contenido */}
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="card divide-y" aria-busy="true" aria-label="Cargando prospectos">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no tenés prospectos"
          description="Sumá a la primera persona con la que estás conversando y empezá a seguirla."
          action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Nuevo prospecto</button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description="Ningún prospecto coincide con la búsqueda o los filtros."
          action={hasFilters ? <button className="btn-ghost" onClick={resetFilters}>Limpiar filtros</button> : undefined}
        />
      ) : (
        <>
          {/* Tabla (desktop) */}
          <div className="card hidden overflow-hidden xl:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Seleccionar todos en esta página" checked={allOnPage} onChange={toggleAll} className="h-4 w-4 rounded border-input accent-orange-500" /></th>
                  <th className="px-2 py-3 font-medium">Prospecto</th>
                  <th className="px-2 py-3 font-medium">Etapa</th>
                  <th className="px-2 py-3 font-medium">Temperatura</th>
                  <th className="px-2 py-3 font-medium">Próximo seguimiento</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((c) => (
                  <tr key={c.id} className={cn('hover:bg-muted/30', selected.has(c.id) && 'bg-orange-50/50')}>
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`Seleccionar ${c.name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4 rounded border-input accent-orange-500" /></td>
                    <td className="px-2 py-3">
                      <button onClick={() => setEditing(c)} className="text-left font-medium hover:underline">{c.name}</button>
                      <p className="text-xs text-muted-foreground">{LABELS.category[c.category]}{c.contactMethod ? ` · ${c.contactMethod}` : ''}</p>
                    </td>
                    <td className="px-2 py-3"><ResultOrStage c={c} /></td>
                    <td className="px-2 py-3"><span className={TEMP_BADGE[c.temperature]}>{LABELS.temperature[c.temperature]}</span></td>
                    <td className="px-2 py-3"><NextAction c={c} today={today} /></td>
                    <td className="px-4 py-3"><RowActions c={c} onFollowUp={followUp} onEdit={setEditing} onDelete={setDeleting} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <ul className="space-y-3 xl:hidden">
            {rows.map((c) => (
              <li key={c.id} className={cn('card p-4', selected.has(c.id) && 'border-orange-300 bg-orange-50/50')}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" aria-label={`Seleccionar ${c.name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 h-4 w-4 rounded border-input accent-orange-500" />
                  <div className="min-w-0 flex-1">
                    <button onClick={() => setEditing(c)} className="block max-w-full truncate text-left font-semibold">{c.name}</button>
                    <p className="text-xs text-muted-foreground">{LABELS.category[c.category]}{c.contactMethod ? ` · ${c.contactMethod}` : ''}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <ResultOrStage c={c} />
                      <span className={TEMP_BADGE[c.temperature]}>{LABELS.temperature[c.temperature]}</span>
                    </div>
                    <div className="mt-2"><NextAction c={c} today={today} /></div>
                  </div>
                </div>
                <div className="mt-3 border-t pt-3"><RowActions c={c} onFollowUp={followUp} onEdit={setEditing} onDelete={setDeleting} wide /></div>
              </li>
            ))}
          </ul>

          {/* Paginación */}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{filtered.length} {filtered.length === 1 ? 'prospecto' : 'prospectos'}</span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <button aria-label="Página anterior" disabled={current === 1} onClick={() => setPage(current - 1)} className="btn-ghost btn-sm w-8 px-0"><ChevronLeft className="h-4 w-4" /></button>
                <span>Página {current} de {pages}</span>
                <button aria-label="Página siguiente" disabled={current === pages} onClick={() => setPage(current + 1)} className="btn-ghost btn-sm w-8 px-0"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </>
      )}

      <FormSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing && editing !== 'new' ? 'Editar prospecto' : 'Nuevo prospecto'}
      >
        {editing !== null && (
          <ProspectForm key={editing === 'new' ? 'new' : editing.id} contact={editing === 'new' ? undefined : editing} onSubmit={save} onCancel={() => setEditing(null)} />
        )}
      </FormSheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="¿Eliminar prospecto?"
        description={`Se eliminará a ${deleting?.name ?? ''} y todo su historial. Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          try {
            await remove(deleting!.id);
            setSelected((s) => { const n = new Set(s); n.delete(deleting!.id); return n; });
            toast.success('Prospecto eliminado');
          } catch (e) { fail(e); }
        }}
      />
      <ConfirmDialog
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        title={`¿Eliminar ${selected.size} prospectos?`}
        description="Se eliminarán de forma permanente. Esta acción no se puede deshacer."
        onConfirm={async () => {
          try {
            await removeMany([...selected]);
            toast.success(`${selected.size} prospectos eliminados`);
            setSelected(new Set());
          } catch (e) { fail(e); }
        }}
      />
    </>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field h-9 text-foreground">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function ResultOrStage({ c }: { c: Contact }) {
  if (c.result !== 'abierto') {
    const good = c.result === 'cliente' || c.result === 'recurrente' || c.result === 'equipo';
    return <span className={good ? 'badge-green' : 'badge-gray'}>{LABELS.result[c.result]}</span>;
  }
  return <span className="badge-orange">{LABELS.stage[c.stage]}</span>;
}

function NextAction({ c, today }: { c: Contact; today: string }) {
  if (c.result !== 'abierto') return <span className="text-xs text-muted-foreground">—</span>;
  const stalled = isStalled(c, today);
  if (!c.nextActionDate) {
    return <span className={cn('text-xs', stalled ? 'font-medium text-yellow-700' : 'text-muted-foreground')}>{stalled ? 'Sin agendar · parado' : 'Sin agendar'}</span>;
  }
  const overdue = c.nextActionDate < today;
  return (
    <div className="min-w-0 text-xs">
      <span className={cn('inline-flex items-center gap-1 font-medium', overdue ? 'text-red-600' : 'text-foreground')}>
        <CalendarClock className="h-3.5 w-3.5" /> {relativeDay(c.nextActionDate, today)}
      </span>
      {c.nextAction && <p className="truncate text-muted-foreground">{c.nextAction}</p>}
    </div>
  );
}

function RowActions({ c, onFollowUp, onEdit, onDelete, wide }: { c: Contact; onFollowUp: (c: Contact) => void; onEdit: (c: Contact) => void; onDelete: (c: Contact) => void; wide?: boolean }) {
  return (
    <div className={cn('flex items-center gap-1', wide ? 'justify-between' : 'justify-end')}>
      {c.result === 'abierto' && (
        <button onClick={() => onFollowUp(c)} className="btn-ghost btn-sm" title="Registrar seguimiento de hoy">
          <MessageCircle className="h-3.5 w-3.5" /> Seguimiento
        </button>
      )}
      <div className="flex items-center gap-1">
        <button aria-label={`Editar ${c.name}`} onClick={() => onEdit(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-4 w-4" /></button>
        <button aria-label={`Eliminar ${c.name}`} onClick={() => onDelete(c)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
