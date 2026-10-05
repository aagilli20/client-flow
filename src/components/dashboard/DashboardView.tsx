'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { AlertCircle, CalendarClock, ChevronLeft, ChevronRight, Copy, Flame, MessageCircle, Minus, Plus, Share2, Target, UserPlus, Users } from 'lucide-react';
import { ErrorState, ProgressRing, Skeleton } from '@/components/app/shared';
import { useToast } from '@/components/app/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { errorText, useCollection, useRepo } from '@/contexts/DataContext';
import { addDays, formatMonth, monthOf, monthRange, parseDate, relativeDay, shiftMonth, todayStr } from '@/lib/dates';
import {
  buildReport,
  computeStreak,
  dayStatus,
  isStalled,
  monthSummary,
  ringPercent,
  RINGS,
  type DayStatus,
} from '@/lib/metrics';
import { DEFAULT_SETTINGS, type ActivityField, type DailyActivity, type UserSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const QUOTES = [
  'La consistencia de hoy es el volumen del próximo mes.',
  'Una conversación más. Esa es la diferencia.',
  'Las personas no compran de la nada: compran de quien les da seguimiento.',
  'Hacé lo simple, todos los días, sin excusas.',
  'El que sigue, consigue.',
  'Cada "ahora no" es un "todavía no".',
  'Tu constancia es tu mejor presentación.',
];
const dayOfYear = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);

const STATUS_STYLE: Record<DayStatus, string> = {
  complete: 'bg-green-500 text-white',
  partial: 'bg-yellow-200 text-yellow-900',
  none: 'bg-muted text-muted-foreground',
};

export default function DashboardView() {
  const { user } = useAuth();
  const repo = useRepo();
  const toast = useToast();
  const locale = useLocale();
  const today = todayStr();
  const [calMonth, setCalMonth] = useState(monthOf(today));

  const activitiesQ = useCollection('daily_activities', { rangeField: 'date', from: addDays(today, -90), to: today });
  const contactsQ = useCollection('contacts');
  const teamQ = useCollection('team_members');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    repo.getSettings().then(setSettings).catch(() => undefined);
  }, [repo]);

  const loading = activitiesQ.loading || contactsQ.loading || teamQ.loading;
  const error = activitiesQ.error ?? contactsQ.error ?? teamQ.error;
  const goals = settings.goals;

  const activities = activitiesQ.data;
  const todayAct = activities.find((a) => a.date === today);
  const streak = useMemo(() => computeStreak(activities, goals, today), [activities, goals, today]);
  const stalled = useMemo(() => contactsQ.data.filter((c) => isStalled(c, today)), [contactsQ.data, today]);
  const agenda = useMemo(
    () =>
      contactsQ.data
        .filter((c) => c.result === 'abierto' && c.nextActionDate && c.nextActionDate <= addDays(today, 1))
        .sort((a, b) => a.nextActionDate!.localeCompare(b.nextActionDate!))
        .slice(0, 5),
    [contactsQ.data, today],
  );
  const summary = useMemo(() => monthSummary(contactsQ.data, teamQ.data, monthOf(today)), [contactsQ.data, teamQ.data, today]);
  const closedRings = RINGS.filter((r) => ringPercent(todayAct, r.field, goals) >= 100).length;
  const name = (settings.displayName || user?.displayName || '').split(' ')[0] ?? '';

  const bump = async (field: ActivityField, by: number) => {
    const before = todayAct?.[field] ?? 0;
    if (before + by < 0) return;
    // actualización optimista
    activitiesQ.setData((list) => {
      const exists = list.some((a) => a.date === today);
      if (exists) return list.map((a) => (a.date === today ? { ...a, [field]: Math.max(0, a[field] + by) } : a));
      const ts = new Date().toISOString();
      const fresh: DailyActivity = { id: `${user?.uid}_${today}`, userId: user?.uid ?? '', date: today, conversations: 0, followUps: 0, posts: 0, createdAt: ts, updatedAt: ts };
      fresh[field] = Math.max(0, by);
      return [fresh, ...list];
    });
    try {
      await repo.incrementActivity(today, field, by);
    } catch (e) {
      toast.error(errorText(e));
      activitiesQ.reload();
    }
  };

  const report = buildReport({ name: settings.displayName || user?.displayName || '', month: monthOf(today), streak, today: todayAct, goals, summary, stalled: stalled.length });
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success('Resumen copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar. Seleccioná el texto manualmente.');
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => { activitiesQ.reload(); contactsQ.reload(); teamQ.reload(); }} />;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-sm sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-500 opacity-20 blur-3xl" />
        <div className="relative">
          <p className="font-mono text-[11px] uppercase tracking-widest text-orange-400">Momento del día</p>
          <h1 className="mt-2 max-w-xl text-xl font-bold tracking-tight sm:text-3xl">
            {name ? `${name}, ` : ''}
            <span className="font-medium text-white/80">{QUOTES[dayOfYear(new Date()) % QUOTES.length]}</span>
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm">
              <Flame className="h-4 w-4 text-orange-400" />
              <strong className="text-base">{loading ? '–' : streak}</strong> {streak === 1 ? 'día seguido' : 'días seguidos'}
            </span>
            <span className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white">
              {closedRings} / {RINGS.length} anillos
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Anillos */}
        <section className="card p-5 sm:p-6 lg:col-span-2" aria-labelledby="rings-title">
          <h2 id="rings-title" className="mb-5 text-lg font-semibold tracking-tight">Lo que tenés para hoy</h2>
          {loading ? (
            <div className="flex justify-around">{RINGS.map((r) => <Skeleton key={r.field} className="h-28 w-24 rounded-full" />)}</div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {RINGS.map((r) => {
                const pct = ringPercent(todayAct, r.field, goals);
                return (
                  <div key={r.field} className="flex flex-col items-center gap-2 text-center">
                    <ProgressRing percent={pct} color={r.color} size={92}>
                      <span className="text-lg font-bold tabular-nums">{todayAct?.[r.field] ?? 0}<span className="text-xs font-medium text-muted-foreground">/{goals[r.field]}</span></span>
                    </ProgressRing>
                    <div>
                      <p className="text-xs font-semibold sm:text-sm">{r.label}</p>
                      <p className="hidden text-xs text-muted-foreground sm:block">{r.hint}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button aria-label={`Restar ${r.label}`} disabled={(todayAct?.[r.field] ?? 0) === 0} onClick={() => bump(r.field, -1)} className="btn-ghost btn-sm w-8 px-0"><Minus className="h-3.5 w-3.5" /></button>
                      <button aria-label={`Sumar ${r.label}`} onClick={() => bump(r.field, 1)} className="btn-primary btn-sm w-8 px-0"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Alertas + agenda */}
        <section className="flex flex-col gap-4" aria-label="Atención">
          <Link
            href={`/${locale}/prospects${stalled.length ? '?filter=stalled' : ''}`}
            className={cn('card flex flex-col items-center justify-center gap-1 p-5 text-center transition-colors hover:border-orange-300', stalled.length > 0 && 'border-yellow-200 bg-yellow-50/60')}
          >
            <AlertCircle className={cn('h-7 w-7', stalled.length ? 'text-yellow-500' : 'text-green-500')} />
            <h3 className="mt-1 font-semibold">{stalled.length ? '¡Atención!' : 'Todo al día'}</h3>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Cargando…' : stalled.length ? `${stalled.length} ${stalled.length === 1 ? 'prospecto parado' : 'prospectos parados'}. Tocá para verlos.` : 'No tenés prospectos parados.'}
            </p>
          </Link>
          <div className="card flex-1 p-5">
            <p className="section-label mb-3 flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5" /> Para hoy y mañana</p>
            {loading ? <Skeleton className="h-16" /> : agenda.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin seguimientos agendados.</p>
            ) : (
              <ul className="space-y-2.5">
                {agenda.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className={cn('shrink-0 text-xs', c.nextActionDate! < today ? 'font-medium text-red-600' : 'text-muted-foreground')}>{relativeDay(c.nextActionDate!, today)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Resumen del mes */}
        <section className="card p-5 sm:p-6" aria-labelledby="month-title">
          <h2 id="month-title" className="section-label mb-4 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Resumen del mes · {formatMonth(monthOf(today))}</h2>
          {loading ? <Skeleton className="h-16" /> : (
            <dl className="grid grid-cols-3 gap-4">
              <Stat icon={Users} label="Volumen del equipo" value={summary.teamVolume.toLocaleString('es-AR')} />
              <Stat icon={MessageCircle} label="Clientes nuevos" value={summary.newClients} />
              <Stat icon={UserPlus} label="Nuevos socios" value={summary.newMembers} />
            </dl>
          )}
        </section>

        {/* Rendición de cuentas */}
        <section className="card flex flex-col justify-between gap-4 p-5 sm:p-6" aria-labelledby="report-title">
          <div>
            <h2 id="report-title" className="section-label mb-2 flex items-center gap-2"><Share2 className="h-3.5 w-3.5" /> Rendición de cuentas</h2>
            <p className="text-sm text-muted-foreground">Un resumen de tu actividad para enviarle a tu sponsor{settings.sponsorName ? ` (${settings.sponsorName})` : ''}.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyReport} disabled={loading} className="btn-ghost flex-1"><Copy className="h-4 w-4" /> Copiar texto</button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(report)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={loading}
              className="btn flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              WhatsApp
            </a>
          </div>
        </section>
      </div>

      {/* Calendario */}
      <section className="card p-5 sm:p-6" aria-labelledby="cal-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="cal-title" className="text-lg font-semibold tracking-tight">{formatMonth(calMonth)}</h2>
          <div className="flex items-center gap-1">
            <button aria-label="Mes anterior" onClick={() => setCalMonth((m) => shiftMonth(m, -1))} className="btn-ghost btn-sm w-8 px-0"><ChevronLeft className="h-4 w-4" /></button>
            <button aria-label="Mes siguiente" disabled={calMonth >= monthOf(today)} onClick={() => setCalMonth((m) => shiftMonth(m, 1))} className="btn-ghost btn-sm w-8 px-0"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <Calendar month={calMonth} today={today} activities={activities} goals={goals} loading={loading} />
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Legend className="bg-green-500" label="Completo" />
          <Legend className="bg-yellow-200" label="Parcial" />
          <Legend className="bg-muted" label="Sin registro" />
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div>
      <Icon className="mb-1.5 h-4 w-4 text-muted-foreground" />
      <dd className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

const Legend = ({ className, label }: { className: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5"><span className={cn('h-3 w-3 rounded', className)} /> {label}</span>
);

function Calendar({ month, today, activities, goals, loading }: { month: string; today: string; activities: DailyActivity[]; goals: UserSettings['goals']; loading: boolean }) {
  const { days } = monthRange(month);
  const offset = (parseDate(`${month}-01`).getDay() + 6) % 7; // semana desde lunes
  const byDate = useMemo(() => new Map(activities.map((a) => [a.date, a])), [activities]);
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          const future = date > today;
          const status = loading || future ? 'none' : dayStatus(byDate.get(date), goals);
          return (
            <div
              key={date}
              title={`${date}: ${status === 'complete' ? 'completo' : status === 'partial' ? 'parcial' : 'sin registro'}`}
              className={cn(
                'flex aspect-square items-center justify-center rounded-lg text-xs font-medium tabular-nums',
                future ? 'bg-transparent text-muted-foreground/50' : STATUS_STYLE[status],
                date === today && 'ring-2 ring-primary ring-offset-1',
              )}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
