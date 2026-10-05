import { z } from 'zod';

/**
 * Modelo de dominio de ClientFlow.
 * - Fechas "de calendario" (día de seguimiento, mes, inicio) son strings ISO `YYYY-MM-DD`.
 * - Instantes (createdAt, updatedAt, lastActionDate) son ISO 8601 en el dominio;
 *   en Firestore se guardan como Timestamp (ver lib/data/firebase-repository.ts).
 */

// ─── Enumeraciones y etiquetas ───────────────────────────────────────────────

export const CATEGORIES = ['negocio', 'cliente'] as const;
export const TEMPERATURES = ['frio', 'tibio', 'caliente'] as const;
export const STAGES = ['conversacion', 'seguimiento', 'presentacion', 'propuesta'] as const;
export const RESULTS = ['abierto', 'cliente', 'recurrente', 'equipo', 'despues', 'no'] as const;
export const MEMBER_STATUSES = ['shadow', 'registered'] as const;
export const POST_CATEGORIES = ['negocio', 'producto', 'estilo_vida'] as const;
export const CHECKLIST = ['lista', 'invitaciones', 'presentacion', 'primera_venta'] as const;

export type Category = (typeof CATEGORIES)[number];
export type Temperature = (typeof TEMPERATURES)[number];
export type Stage = (typeof STAGES)[number];
export type Result = (typeof RESULTS)[number];
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export type PostCategory = (typeof POST_CATEGORIES)[number];
export type ChecklistKey = (typeof CHECKLIST)[number];

export const LABELS = {
  category: { negocio: 'Negocio', cliente: 'Producto' } as Record<Category, string>,
  temperature: { frio: 'Frío', tibio: 'Tibio', caliente: 'Caliente' } as Record<Temperature, string>,
  stage: {
    conversacion: 'Conversación iniciada',
    seguimiento: 'En seguimiento',
    presentacion: 'Presentación',
    propuesta: 'Propuesta',
  } as Record<Stage, string>,
  result: {
    abierto: 'Abierto',
    cliente: 'Cliente',
    recurrente: 'Cliente recurrente',
    equipo: 'Entró al equipo',
    despues: 'Ahora no',
    no: 'No',
  } as Record<Result, string>,
  memberStatus: { shadow: 'Nodo sombra', registered: 'Con cuenta' } as Record<MemberStatus, string>,
  postCategory: {
    negocio: 'Negocio',
    producto: 'Producto',
    estilo_vida: 'Estilo de vida',
  } as Record<PostCategory, string>,
  checklist: {
    lista: 'Lista de contactos',
    invitaciones: 'Primeras invitaciones',
    presentacion: 'Primera presentación',
    primera_venta: 'Primera venta',
  } as Record<ChecklistKey, string>,
};

// ─── Esquemas de formulario / validación (también se usan en tests) ──────────

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');
const optionalDate = z.union([dateOnly, z.literal('')]).optional();

export const contactInputSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(80, 'Máximo 80 caracteres'),
  contactMethod: z.string().trim().max(80, 'Máximo 80 caracteres').optional(),
  category: z.enum(CATEGORIES),
  temperature: z.enum(TEMPERATURES),
  stage: z.enum(STAGES),
  result: z.enum(RESULTS),
  notes: z.string().trim().max(1000, 'Máximo 1000 caracteres').optional(),
  nextAction: z.string().trim().max(120, 'Máximo 120 caracteres').optional(),
  nextActionDate: optionalDate,
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const teamMemberInputSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(80, 'Máximo 80 caracteres'),
  status: z.enum(MEMBER_STATUSES),
  sponsorId: z.string().nullable(),
  monthlyVolume: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).min(0, 'No puede ser negativo').max(10_000_000),
  startDate: dateOnly,
});
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;

export const socialPostInputSchema = z.object({
  date: dateOnly,
  category: z.enum(POST_CATEGORIES),
  note: z.string().trim().max(200, 'Máximo 200 caracteres').optional(),
});
export type SocialPostInput = z.infer<typeof socialPostInputSchema>;

export const focusMetricInputSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(60, 'Máximo 60 caracteres'),
  monthlyTarget: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).positive('Debe ser mayor que 0').max(10_000_000),
  currentValue: z.coerce.number({ invalid_type_error: 'Ingresá un número' }).min(0, 'No puede ser negativo').max(10_000_000),
  weight: z.coerce.number().int().min(1).max(5),
});
export type FocusMetricInput = z.infer<typeof focusMetricInputSchema>;

export const settingsSchema = z.object({
  displayName: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(80),
  sponsorName: z.string().trim().max(80).optional(),
  goalConversations: z.coerce.number().int().min(1, 'Mínimo 1').max(100),
  goalFollowUps: z.coerce.number().int().min(1, 'Mínimo 1').max(100),
  goalPosts: z.coerce.number().int().min(1, 'Mínimo 1').max(20),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

// ─── Documentos persistidos ──────────────────────────────────────────────────

interface Base {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact extends Base {
  name: string;
  contactMethod?: string;
  category: Category;
  temperature: Temperature;
  stage: Stage;
  result: Result;
  notes?: string;
  nextAction?: string;
  nextActionDate?: string; // '' / undefined = sin agendar
  followUpsCount: number;
  lastActionDate?: string;
}

export interface TeamMember extends Base {
  name: string;
  status: MemberStatus;
  sponsorId: string | null; // null = reclutado directo
  monthlyVolume: number;
  startDate: string;
  checklist: ChecklistKey[];
}

export interface SocialPost extends Base {
  date: string;
  category: PostCategory;
  note?: string;
}

export interface FocusMetric extends Base {
  name: string;
  monthlyTarget: number;
  currentValue: number;
  weight: number;
  month: string; // YYYY-MM
}

/** Un doc por usuario y día. id = `${userId}_${date}` */
export interface DailyActivity extends Base {
  date: string;
  conversations: number;
  followUps: number;
  posts: number;
}
export type ActivityField = 'conversations' | 'followUps' | 'posts';

export interface UserSettings {
  displayName: string;
  sponsorName?: string;
  goals: Record<ActivityField, number>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: '',
  sponsorName: '',
  goals: { conversations: 3, followUps: 3, posts: 1 },
};

export interface CollectionMap {
  contacts: Contact;
  team_members: TeamMember;
  social_posts: SocialPost;
  focus_metrics: FocusMetric;
  daily_activities: DailyActivity;
}
export type CollectionName = keyof CollectionMap;
export type NewDoc<K extends CollectionName> = Omit<CollectionMap[K], 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
