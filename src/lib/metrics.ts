import { addDays, daysBetween, formatMonth, todayStr } from './dates';
import {
  DEFAULT_SETTINGS,
  type ActivityField,
  type Contact,
  type DailyActivity,
  type FocusMetric,
  type TeamMember,
  type UserSettings,
} from './types';

export const RINGS: { field: ActivityField; label: string; hint: string; color: string }[] = [
  { field: 'conversations', label: 'Conversaciones', hint: 'Nuevas conversaciones iniciadas', color: '#f97316' },
  { field: 'followUps', label: 'Seguimientos', hint: 'Seguimientos realizados', color: '#0ea5e9' },
  { field: 'posts', label: 'Publicaciones', hint: 'Contenido publicado en redes', color: '#16a34a' },
];

export const STALLED_AFTER_DAYS = 7;

export function ringPercent(activity: Partial<DailyActivity> | undefined, field: ActivityField, goals = DEFAULT_SETTINGS.goals) {
  const goal = Math.max(1, goals[field]);
  return Math.min(100, Math.round(((activity?.[field] ?? 0) / goal) * 100));
}

export type DayStatus = 'complete' | 'partial' | 'none';

export function dayStatus(activity: Partial<DailyActivity> | undefined, goals: UserSettings['goals']): DayStatus {
  if (!activity) return 'none';
  const pcts = RINGS.map((r) => ringPercent(activity, r.field, goals));
  if (pcts.every((p) => p >= 100)) return 'complete';
  if (pcts.some((p) => p > 0)) return 'partial';
  return 'none';
}

/** Días consecutivos con los tres anillos cerrados. Hoy incompleto no corta la racha. */
export function computeStreak(activities: DailyActivity[], goals: UserSettings['goals'], today = todayStr()) {
  const byDate = new Map(activities.map((a) => [a.date, a]));
  let cursor = today;
  if (dayStatus(byDate.get(cursor), goals) !== 'complete') cursor = addDays(cursor, -1);
  let streak = 0;
  while (dayStatus(byDate.get(cursor), goals) === 'complete') {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Un prospecto "parado": abierto y con acción vencida o sin movimiento hace más de 7 días. */
export function isStalled(c: Contact, today = todayStr()) {
  if (c.result !== 'abierto') return false;
  if (c.nextActionDate && c.nextActionDate < today) return true;
  const last = (c.lastActionDate ?? c.createdAt).slice(0, 10);
  return !c.nextActionDate && daysBetween(last, today) > STALLED_AFTER_DAYS;
}

export function monthSummary(contacts: Contact[], team: TeamMember[], month: string) {
  const inMonth = (iso?: string) => !!iso && iso.startsWith(month);
  return {
    teamVolume: team.reduce((sum, m) => sum + m.monthlyVolume, 0),
    newClients: contacts.filter((c) => (c.result === 'cliente' || c.result === 'recurrente') && inMonth(c.updatedAt)).length,
    newMembers: team.filter((m) => inMonth(m.startDate)).length,
  };
}

export function metricProgress(m: Pick<FocusMetric, 'currentValue' | 'monthlyTarget'>) {
  return Math.min(100, Math.round((m.currentValue / Math.max(1, m.monthlyTarget)) * 100));
}

/** Texto de "rendición de cuentas" para enviar al sponsor. */
export function buildReport(args: {
  name: string;
  month: string;
  streak: number;
  today: Partial<DailyActivity> | undefined;
  goals: UserSettings['goals'];
  summary: ReturnType<typeof monthSummary>;
  stalled: number;
}) {
  const { name, month, streak, today, goals, summary, stalled } = args;
  const line = (label: string, f: ActivityField) => `• ${label}: ${today?.[f] ?? 0}/${goals[f]}`;
  return [
    `Rendición de cuentas${name ? ` — ${name}` : ''}`,
    `${formatMonth(month)}`,
    '',
    `Hoy`,
    line('Conversaciones', 'conversations'),
    line('Seguimientos', 'followUps'),
    line('Publicaciones', 'posts'),
    `🔥 Racha: ${streak} ${streak === 1 ? 'día' : 'días'}`,
    '',
    `Resumen del mes`,
    `• Volumen del equipo: ${summary.teamVolume.toLocaleString('es-AR')}`,
    `• Clientes nuevos: ${summary.newClients}`,
    `• Nuevos socios: ${summary.newMembers}`,
    `• Prospectos parados: ${stalled}`,
  ].join('\n');
}

/** Árbol de equipo a partir de la lista plana (sponsorId). Tolera ciclos y huérfanos. */
export interface TeamNode {
  member: TeamMember;
  children: TeamNode[];
}
export function buildTeamTree(team: TeamMember[]): TeamNode[] {
  const ids = new Set(team.map((m) => m.id));
  const nodes = new Map<string, TeamNode>(team.map((m) => [m.id, { member: m, children: [] }]));
  const roots: TeamNode[] = [];
  for (const m of team) {
    const node = nodes.get(m.id)!;
    const parent = m.sponsorId && m.sponsorId !== m.id && ids.has(m.sponsorId) ? nodes.get(m.sponsorId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (list: TeamNode[]) => {
    list.sort((a, b) => a.member.name.localeCompare(b.member.name, 'es'));
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Ids de un miembro y todos sus descendientes (para evitar ciclos al elegir sponsor). */
export function descendantIds(team: TeamMember[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const m of team) {
      if (m.sponsorId && out.has(m.sponsorId) && !out.has(m.id)) {
        out.add(m.id);
        grew = true;
      }
    }
  }
  return out;
}
