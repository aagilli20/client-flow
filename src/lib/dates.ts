/** Utilidades de fecha en hora local (las fechas de calendario son strings YYYY-MM-DD). */

const pad = (n: number) => String(n).padStart(2, '0');

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());
export const monthOf = (dateStr: string) => dateStr.slice(0, 7);

export function parseDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(dateStr: string, days: number) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function daysBetween(fromStr: string, toStr: string) {
  const ms = parseDate(toStr).getTime() - parseDate(fromStr).getTime();
  return Math.round(ms / 86_400_000);
}

export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y!, m!, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}`, days: last };
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y!, m! - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function formatMonth(month: string) {
  const s = parseDate(`${month}-01`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDay(dateStr: string, withYear = false) {
  return parseDate(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** Fecha relativa amigable para próximas acciones. */
export function relativeDay(dateStr: string, today = todayStr()) {
  const diff = daysBetween(today, dateStr);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff < 0) return `Hace ${-diff} días`;
  if (diff < 7) return `En ${diff} días`;
  return formatDay(dateStr);
}
