import { phoneDigits, splitContactMethod } from './contact-link';
import { contactInputSchema, CATEGORIES, RESULTS, STAGES, TEMPERATURES, type ContactInput } from './types';

/** Importación de prospectos desde CSV. Lógica pura (sin DOM) para poder testearla. */

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 1_000_000;

export const CSV_TEMPLATE =
  'nombre,telefono,red_social,email,categoria,temperatura,etapa,resultado,proxima_accion,fecha_proximo_seguimiento,notas\n' +
  'Lucía Fernández,5493425482222,instagram.com/lucia.fernandez,lucia@example.com,negocio,caliente,propuesta,abierto,Enviar propuesta,2026-10-20,Muy interesada\n' +
  'Martín Rossi,,instagram.com/martinrossi,,producto,tibio,seguimiento,abierto,,,\n';

/** Parser CSV (RFC 4180): comillas, comillas escapadas "" y saltos de línea dentro de campos. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const count = (c: string) => firstLine.split(c).length - 1;
  const delim = count(';') > count(',') && count(';') >= count('\t') ? ';' : count('\t') > count(',') ? '\t' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Encabezados del formato anterior (un solo campo): se reparte en teléfono / red social / email. */
const LEGACY_METHOD = ['medio_de_contacto', 'medio_contacto', 'medio', 'contacto'];

const HEADERS: Record<keyof ContactInput, string[]> = {
  name: ['nombre', 'name', 'prospecto', 'nombre_y_apellido', 'apellido_y_nombre'],
  phone: ['telefono', 'tel', 'celular', 'whatsapp', 'movil', 'phone'],
  social: ['red_social', 'redes_sociales', 'red', 'social', 'instagram', 'ig', 'link', 'facebook'],
  email: ['email', 'e_mail', 'mail', 'correo', 'correo_electronico'],
  category: ['categoria', 'category', 'tipo'],
  temperature: ['temperatura', 'temperature'],
  stage: ['etapa', 'stage'],
  result: ['resultado', 'result', 'estado'],
  notes: ['notas', 'nota', 'notes', 'observaciones', 'comentarios'],
  nextAction: ['proxima_accion', 'next_action', 'accion'],
  nextActionDate: ['fecha_proximo_seguimiento', 'proximo_seguimiento', 'fecha_seguimiento', 'fecha_proxima_accion', 'fecha'],
};

const VALUE_ALIASES: Record<string, Record<string, string>> = {
  category: { negocio: 'negocio', cliente: 'cliente', producto: 'cliente' },
  temperature: { frio: 'frio', fria: 'frio', tibio: 'tibio', tibia: 'tibio', templado: 'tibio', caliente: 'caliente' },
  stage: {
    conversacion: 'conversacion', conversacion_iniciada: 'conversacion', seguimiento: 'seguimiento', en_seguimiento: 'seguimiento',
    presentacion: 'presentacion', propuesta: 'propuesta',
  },
  result: {
    abierto: 'abierto', cliente: 'cliente', recurrente: 'recurrente', cliente_recurrente: 'recurrente', equipo: 'equipo',
    entro_al_equipo: 'equipo', despues: 'despues', ahora_no: 'despues', no: 'no',
  },
};
const ALLOWED = { category: CATEGORIES, temperature: TEMPERATURES, stage: STAGES, result: RESULTS } as const;
const FIELD_LABEL: Record<string, string> = {
  name: 'nombre', phone: 'teléfono', social: 'red social', email: 'email', category: 'categoría', temperature: 'temperatura', stage: 'etapa',
  result: 'resultado', notes: 'notas', nextAction: 'próxima acción', nextActionDate: 'fecha de seguimiento',
};

function parseDate(v: string): string | null {
  const s = v.trim();
  if (!s) return '';
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (match) [y, m, d] = [+match[1]!, +match[2]!, +match[3]!];
  else if ((match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s))) [d, m, y] = [+match[1]!, +match[2]!, +match[3]!];
  else return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface ImportRow {
  line: number; // número de línea en el archivo (1 = encabezado)
  input?: ContactInput;
  errors: string[];
}
export interface ImportParse {
  rows: ImportRow[];
  ignoredColumns: string[];
  fatal?: string;
}

export function parseContactsCsv(text: string): ImportParse {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], ignoredColumns: [], fatal: 'El archivo está vacío.' };

  const header = table[0]!.map(norm);
  const colOf: Partial<Record<keyof ContactInput, number>> = {};
  (Object.keys(HEADERS) as (keyof ContactInput)[]).forEach((field) => {
    const idx = header.findIndex((h) => HEADERS[field].includes(h));
    if (idx >= 0) colOf[field] = idx;
  });
  const legacyCol = header.findIndex((h) => LEGACY_METHOD.includes(h));
  const used = new Set([...Object.values(colOf), ...(legacyCol >= 0 ? [legacyCol] : [])]);
  const ignoredColumns = table[0]!.filter((_, i) => !used.has(i) && header[i] !== '');

  if (colOf.name === undefined) {
    return { rows: [], ignoredColumns, fatal: 'No encontré la columna "nombre" en el encabezado (primera fila).' };
  }
  if (table.length === 1) return { rows: [], ignoredColumns, fatal: 'El archivo solo tiene encabezado, sin filas de datos.' };
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return { rows: [], ignoredColumns, fatal: `El archivo tiene ${table.length - 1} filas; el máximo por importación es ${MAX_IMPORT_ROWS}.` };
  }

  const rows: ImportRow[] = table.slice(1).map((cells, i) => {
    const get = (f: keyof ContactInput) => (colOf[f] === undefined ? '' : (cells[colOf[f]] ?? '').trim());
    const errors: string[] = [];
    const draft: Record<string, string> = {
      name: get('name'), phone: get('phone'), social: get('social'), email: get('email'), notes: get('notes'), nextAction: get('nextAction'),
      category: 'negocio', temperature: 'tibio', stage: 'conversacion', result: 'abierto', nextActionDate: '',
    };

    if (legacyCol >= 0) {
      const legacy = splitContactMethod(cells[legacyCol] ?? '');
      for (const k of ['phone', 'social', 'email'] as const) draft[k] ||= legacy[k];
    }
    if (draft.phone) {
      const digits = phoneDigits(draft.phone);
      if (/^\+?[\d\s().-]+$/.test(draft.phone)) draft.phone = digits; // normaliza; si trae letras, falla la validación
    }

    for (const f of ['category', 'temperature', 'stage', 'result'] as const) {
      const raw = get(f);
      if (!raw) continue;
      const mapped = VALUE_ALIASES[f]![norm(raw)];
      if (mapped && (ALLOWED[f] as readonly string[]).includes(mapped)) draft[f] = mapped;
      else errors.push(`${FIELD_LABEL[f]} "${raw}" no es válido (usá: ${(ALLOWED[f] as readonly string[]).join(', ')})`);
    }
    const rawDate = get('nextActionDate');
    if (rawDate) {
      const date = parseDate(rawDate);
      if (date === null) errors.push(`fecha "${rawDate}" no es válida (usá AAAA-MM-DD o DD/MM/AAAA)`);
      else draft.nextActionDate = date;
    }

    const parsed = contactInputSchema.safeParse(draft);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (!errors.some((e) => e.startsWith(FIELD_LABEL[key] ?? '\0'))) errors.push(`${FIELD_LABEL[key] ?? key}: ${issue.message}`);
      }
    }
    return { line: i + 2, ...(errors.length === 0 && parsed.success ? { input: parsed.data } : {}), errors };
  });

  return { rows, ignoredColumns };
}
