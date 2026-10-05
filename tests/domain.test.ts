import { describe, expect, it } from 'vitest';
import { addDays, monthRange, relativeDay, shiftMonth } from '@/lib/dates';
import {
  buildReport,
  buildTeamTree,
  computeStreak,
  dayStatus,
  descendantIds,
  isStalled,
  metricProgress,
  monthSummary,
  ringPercent,
} from '@/lib/metrics';
import { buildSeed } from '@/lib/seed-data';
import {
  contactInputSchema,
  DEFAULT_SETTINGS,
  focusMetricInputSchema,
  teamMemberInputSchema,
  type Contact,
  type DailyActivity,
} from '@/lib/types';

const TODAY = '2026-10-04';
const NOW = new Date(2026, 9, 4, 12);
const goals = DEFAULT_SETTINGS.goals;

const act = (date: string, c: number, f: number, p: number): DailyActivity => ({
  id: date, userId: 'u', date, conversations: c, followUps: f, posts: p, createdAt: '', updatedAt: '',
});
const contact = (over: Partial<Contact>): Contact => ({
  id: 'c', userId: 'u', name: 'X Y', category: 'negocio', temperature: 'tibio', stage: 'conversacion', result: 'abierto',
  followUpsCount: 0, createdAt: `${TODAY}T10:00:00.000Z`, updatedAt: `${TODAY}T10:00:00.000Z`, ...over,
});

describe('fechas', () => {
  it('suma días y cruza meses', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('rango de mes y desplazamiento', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28', days: 28 });
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
  it('fecha relativa', () => {
    expect(relativeDay(TODAY, TODAY)).toBe('Hoy');
    expect(relativeDay('2026-10-03', TODAY)).toBe('Ayer');
    expect(relativeDay('2026-10-01', TODAY)).toBe('Hace 3 días');
  });
});

describe('anillos y racha', () => {
  it('porcentaje acotado a 100', () => {
    expect(ringPercent(act(TODAY, 6, 0, 0), 'conversations', goals)).toBe(100);
    expect(ringPercent(act(TODAY, 1, 0, 0), 'conversations', goals)).toBe(33);
    expect(ringPercent(undefined, 'posts', goals)).toBe(0);
  });
  it('estado del día', () => {
    expect(dayStatus(act(TODAY, 3, 3, 1), goals)).toBe('complete');
    expect(dayStatus(act(TODAY, 1, 0, 0), goals)).toBe('partial');
    expect(dayStatus(act(TODAY, 0, 0, 0), goals)).toBe('none');
    expect(dayStatus(undefined, goals)).toBe('none');
  });
  it('la racha no se corta por un hoy incompleto', () => {
    const list = [act(addDays(TODAY, -1), 3, 3, 1), act(addDays(TODAY, -2), 3, 3, 1), act(TODAY, 1, 0, 0)];
    expect(computeStreak(list, goals, TODAY)).toBe(2);
  });
  it('hoy completo suma a la racha y un hueco la corta', () => {
    const list = [act(TODAY, 3, 3, 1), act(addDays(TODAY, -1), 3, 3, 1), act(addDays(TODAY, -3), 3, 3, 1)];
    expect(computeStreak(list, goals, TODAY)).toBe(2);
    expect(computeStreak([], goals, TODAY)).toBe(0);
  });
});

describe('prospectos parados', () => {
  it('acción vencida => parado', () => {
    expect(isStalled(contact({ nextActionDate: '2026-10-03' }), TODAY)).toBe(true);
    expect(isStalled(contact({ nextActionDate: TODAY }), TODAY)).toBe(false);
  });
  it('sin agenda y sin movimiento hace > 7 días => parado', () => {
    expect(isStalled(contact({ lastActionDate: '2026-09-20T10:00:00.000Z' }), TODAY)).toBe(true);
    expect(isStalled(contact({ lastActionDate: '2026-10-01T10:00:00.000Z' }), TODAY)).toBe(false);
  });
  it('un prospecto cerrado nunca está parado', () => {
    expect(isStalled(contact({ result: 'cliente', nextActionDate: '2026-01-01' }), TODAY)).toBe(false);
  });
});

describe('equipo', () => {
  const { team_members } = buildSeed('u', NOW);
  it('arma el árbol sin perder miembros', () => {
    const count = (nodes: ReturnType<typeof buildTeamTree>): number => nodes.reduce((s, n) => s + 1 + count(n.children), 0);
    expect(count(buildTeamTree(team_members))).toBe(team_members.length);
  });
  it('un sponsor inexistente o circular no rompe el árbol', () => {
    const [a, b] = team_members as [typeof team_members[0], typeof team_members[0]];
    const tree = buildTeamTree([{ ...a, sponsorId: 'nope' }, { ...b, sponsorId: b.id }]);
    expect(tree).toHaveLength(2);
  });
  it('descendientes evitan ciclos al elegir sponsor', () => {
    const paula = team_members.find((m) => m.name === 'Paula Domínguez')!;
    const ids = descendantIds(team_members, paula.id);
    expect(ids.has(paula.id)).toBe(true);
    expect(ids.has(team_members.find((m) => m.name === 'Gonzalo Ferreyra')!.id)).toBe(true);
    expect(ids.has(team_members.find((m) => m.name === 'Marina Ibáñez')!.id)).toBe(false);
  });
});

describe('resumen y reporte', () => {
  const seed = buildSeed('u', NOW);
  it('resumen del mes', () => {
    const s = monthSummary(seed.contacts, seed.team_members, '2026-10');
    expect(s.teamVolume).toBe(seed.team_members.reduce((a, m) => a + m.monthlyVolume, 0));
    expect(s.newClients).toBeGreaterThan(0);
  });
  it('progreso de métrica acotado', () => {
    expect(metricProgress({ currentValue: 50, monthlyTarget: 10 })).toBe(100);
    expect(metricProgress({ currentValue: 5, monthlyTarget: 10 })).toBe(50);
  });
  it('texto de rendición de cuentas', () => {
    const text = buildReport({ name: 'Ana', month: '2026-10', streak: 3, today: act(TODAY, 2, 1, 0), goals, summary: monthSummary(seed.contacts, seed.team_members, '2026-10'), stalled: 2 });
    expect(text).toContain('Ana');
    expect(text).toContain('Conversaciones: 2/3');
    expect(text).toContain('Racha: 3 días');
  });
});

describe('seed de demostración', () => {
  const seed = buildSeed('uid1', NOW);
  it('todos los documentos pertenecen al usuario y usan ids únicos', () => {
    for (const col of ['contacts', 'team_members', 'social_posts', 'focus_metrics', 'daily_activities'] as const) {
      const ids = seed[col].map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(seed[col].every((d) => d.userId === 'uid1')).toBe(true);
    }
  });
  it('los datos cumplen los esquemas del formulario', () => {
    for (const c of seed.contacts) expect(contactInputSchema.safeParse(c).success, c.name).toBe(true);
    for (const m of seed.team_members) expect(teamMemberInputSchema.safeParse(m).success, m.name).toBe(true);
    for (const f of seed.focus_metrics) expect(focusMetricInputSchema.safeParse(f).success, f.name).toBe(true);
  });
  it('incluye prospectos parados y una racha vigente', () => {
    expect(seed.contacts.some((c) => isStalled(c, TODAY))).toBe(true);
    expect(computeStreak(seed.daily_activities, goals, TODAY)).toBeGreaterThanOrEqual(3);
  });
});

describe('validación', () => {
  it('rechaza nombre corto y fecha inválida', () => {
    expect(contactInputSchema.safeParse({ name: 'A', category: 'negocio', temperature: 'frio', stage: 'conversacion', result: 'abierto' }).success).toBe(false);
    expect(contactInputSchema.safeParse({ name: 'Ana', category: 'negocio', temperature: 'frio', stage: 'conversacion', result: 'abierto', nextActionDate: '4/10/2026' }).success).toBe(false);
  });
  it('coerciona y limita números', () => {
    expect(teamMemberInputSchema.parse({ name: 'Ana', status: 'shadow', sponsorId: null, monthlyVolume: '120', startDate: TODAY }).monthlyVolume).toBe(120);
    expect(teamMemberInputSchema.safeParse({ name: 'Ana', status: 'shadow', sponsorId: null, monthlyVolume: -5, startDate: TODAY }).success).toBe(false);
    expect(focusMetricInputSchema.safeParse({ name: 'Meta', monthlyTarget: 0, currentValue: 0, weight: 3 }).success).toBe(false);
  });
});
