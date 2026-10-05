import { addDays, monthOf, toDateStr } from './dates';
import type {
  Category,
  ChecklistKey,
  Contact,
  DailyActivity,
  FocusMetric,
  MemberStatus,
  PostCategory,
  Result,
  SocialPost,
  Stage,
  TeamMember,
  Temperature,
  UserSettings,
} from './types';

/**
 * Datos de demostración 100% ficticios. Función pura: la usan el modo demo del
 * navegador y el script de seed de Firestore (scripts/seed.ts).
 */
export interface SeedData {
  contacts: Contact[];
  team_members: TeamMember[];
  social_posts: SocialPost[];
  focus_metrics: FocusMetric[];
  daily_activities: DailyActivity[];
  settings: UserSettings;
}

const iso = (day: string, hour = 12) => `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;

export function buildSeed(uid: string, now = new Date()): SeedData {
  const today = toDateStr(now);
  const month = monthOf(today);
  const d = (offset: number) => addDays(today, offset);

  const contactRows: [string, string, Category, Temperature, Stage, Result, number, number | null, string?, string?][] = [
    // nombre, medio, categoría, temperatura, etapa, resultado, creado (días atrás), próxima acción (offset), acción, nota
    ['Lucía Fernández', 'WhatsApp', 'negocio', 'caliente', 'propuesta', 'abierto', 12, 1, 'Enviar propuesta final', 'Muy interesada en el plan de carrera.'],
    ['Martín Rossi', 'Instagram', 'cliente', 'tibio', 'seguimiento', 'abierto', 20, -3, 'Preguntar cómo le fue con la muestra'],
    ['Valentina Gómez', 'WhatsApp', 'cliente', 'caliente', 'presentacion', 'abierto', 6, 0, 'Videollamada de presentación', 'Prefiere por la tarde.'],
    ['Joaquín Peralta', 'Facebook', 'negocio', 'frio', 'conversacion', 'abierto', 15, null, undefined, 'Se cruzó en un evento. Sin respuesta desde entonces.'],
    ['Camila Ortiz', 'Instagram', 'negocio', 'tibio', 'seguimiento', 'abierto', 9, 2, 'Invitar al webinar del jueves'],
    ['Nicolás Benítez', 'WhatsApp', 'cliente', 'frio', 'conversacion', 'abierto', 3, 3, 'Primer seguimiento'],
    ['Sofía Aguirre', 'Teléfono', 'cliente', 'caliente', 'propuesta', 'cliente', 30, null, undefined, 'Primera compra realizada.'],
    ['Tomás Villalba', 'WhatsApp', 'negocio', 'caliente', 'propuesta', 'equipo', 40, null, undefined, 'Entró al equipo este mes.'],
    ['Agustina Molina', 'Instagram', 'cliente', 'tibio', 'seguimiento', 'recurrente', 60, null],
    ['Federico Luna', 'WhatsApp', 'negocio', 'frio', 'conversacion', 'despues', 25, 30, 'Retomar contacto', 'Pidió que lo llame el mes próximo.'],
    ['Julieta Navarro', 'Facebook', 'cliente', 'frio', 'conversacion', 'no', 45, null],
    ['Emiliano Suárez', 'WhatsApp', 'negocio', 'tibio', 'presentacion', 'abierto', 18, -1, 'Resolver dudas de la presentación'],
    ['Renata Campos', 'Instagram', 'cliente', 'caliente', 'seguimiento', 'abierto', 5, 1, 'Confirmar pedido de reposición'],
    ['Bruno Medina', 'WhatsApp', 'negocio', 'tibio', 'conversacion', 'abierto', 10, null, undefined, 'Trabaja en turnos rotativos.'],
    ['Delfina Acosta', 'Instagram', 'cliente', 'tibio', 'presentacion', 'abierto', 8, 4, 'Mostrar catálogo nuevo'],
    ['Ignacio Herrera', 'Teléfono', 'negocio', 'frio', 'seguimiento', 'abierto', 22, null],
  ];

  const contacts: Contact[] = contactRows.map(([name, method, category, temperature, stage, result, ago, next, action, notes], i) => {
    const created = d(-ago);
    const last = result === 'abierto' && next === null ? d(-Math.min(ago, 9)) : d(-Math.min(ago, 2));
    return {
      id: `${uid}-c${i + 1}`,
      userId: uid,
      name,
      contactMethod: method,
      category,
      temperature,
      stage,
      result,
      notes,
      nextAction: action,
      nextActionDate: next === null ? '' : d(next),
      followUpsCount: Math.min(ago, 6),
      lastActionDate: iso(last, 15),
      createdAt: iso(created, 10),
      updatedAt: iso(result === 'cliente' || result === 'recurrente' ? d(-1) : last, 15),
    };
  });

  const tm: [string, string | null, MemberStatus, number, number, ChecklistKey[]][] = [
    ['Paula Domínguez', null, 'registered', 420, 120, ['lista', 'invitaciones', 'presentacion', 'primera_venta']],
    ['Tomás Villalba', null, 'registered', 180, 20, ['lista', 'invitaciones', 'presentacion']],
    ['Marina Ibáñez', null, 'shadow', 90, 6, ['lista', 'invitaciones']],
    ['Lautaro Quiroga', 'Paula Domínguez', 'registered', 260, 85, ['lista', 'invitaciones', 'presentacion', 'primera_venta']],
    ['Abril Santoro', 'Paula Domínguez', 'shadow', 60, 9, ['lista']],
    ['Gonzalo Ferreyra', 'Lautaro Quiroga', 'shadow', 120, 40, ['lista', 'invitaciones', 'presentacion', 'primera_venta']],
    ['Clara Montes', 'Lautaro Quiroga', 'shadow', 0, 3, []],
    ['Rocío Beltrán', 'Tomás Villalba', 'registered', 75, 14, ['lista', 'invitaciones']],
  ];
  const idOf = (name: string | null) => (name ? `${uid}-m${tm.findIndex((t) => t[0] === name) + 1}` : null);
  const team_members: TeamMember[] = tm.map(([name, sponsor, status, volume, ago, checklist], i) => ({
    id: `${uid}-m${i + 1}`,
    userId: uid,
    name,
    status,
    sponsorId: idOf(sponsor),
    monthlyVolume: volume,
    startDate: d(-ago),
    checklist,
    createdAt: iso(d(-ago), 9),
    updatedAt: iso(d(-ago), 9),
  }));

  const postRows: [PostCategory, string][] = [
    ['negocio', 'Historia: mi rutina de mañana'],
    ['producto', 'Reel: antes y después de 30 días'],
    ['estilo_vida', 'Foto del finde con la familia'],
    ['producto', 'Testimonio de una clienta'],
    ['negocio', 'Carrusel: 3 errores al empezar'],
    ['estilo_vida', 'Historia: café y planificación'],
    ['producto', 'Receta rápida con el producto'],
    ['negocio', 'Live: preguntas y respuestas'],
    ['estilo_vida', 'Caminata matutina'],
    ['producto', 'Unboxing de pedido nuevo'],
  ];
  const social_posts: SocialPost[] = postRows.map(([category, note], i) => ({
    id: `${uid}-p${i + 1}`,
    userId: uid,
    date: d(-i * 2 - (i % 2)),
    category,
    note,
    createdAt: iso(d(-i * 2 - (i % 2)), 18),
    updatedAt: iso(d(-i * 2 - (i % 2)), 18),
  }));

  const metricRows: [string, number, number, number][] = [
    ['Nuevas conversaciones', 60, 38, 5],
    ['Presentaciones realizadas', 12, 7, 4],
    ['Clientes nuevos', 8, 5, 5],
    ['Publicaciones', 25, 14, 3],
  ];
  const focus_metrics: FocusMetric[] = metricRows.map(([name, target, current, weight], i) => ({
    id: `${uid}-f${i + 1}`,
    userId: uid,
    name,
    monthlyTarget: target,
    currentValue: current,
    weight,
    month,
    createdAt: iso(`${month}-01`, 8),
    updatedAt: iso(today, 8),
  }));

  // Actividad de los últimos 35 días con un patrón variado (racha vigente corta incluida).
  const daily_activities: DailyActivity[] = [];
  for (let ago = 0; ago < 35; ago++) {
    const day = d(-ago);
    const pattern = ago === 0 ? 3 : (ago * 7 + 3) % 10;
    // <2: sin registro, 2-4: parcial, resto: completo (ago 1..4 siempre completos → racha de 4)
    const level = ago >= 1 && ago <= 4 ? 9 : pattern;
    if (level < 2 && ago !== 0) continue;
    const complete = level >= 5;
    daily_activities.push({
      id: `${uid}_${day}`,
      userId: uid,
      date: day,
      conversations: complete ? 3 + (level % 2) : level >= 2 ? 1 : 0,
      followUps: complete ? 3 + (level % 3) : level >= 3 ? 1 : 0,
      posts: complete ? 1 + (level % 2) : 0,
      createdAt: iso(day, 20),
      updatedAt: iso(day, 20),
    });
  }

  return {
    contacts,
    team_members,
    social_posts,
    focus_metrics,
    daily_activities,
    settings: {
      displayName: 'Carolina Ríos',
      sponsorName: 'Paula Domínguez',
      goals: { conversations: 3, followUps: 3, posts: 1 },
    },
  };
}
