/**
 * Medios de contacto de un prospecto: teléfono, red social y email.
 * Solo se generan links http/https y mailto: (nunca javascript: u otros esquemas).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PHONE_MIN_DIGITS = 8;
export const PHONE_MAX_DIGITS = 15;

/** Solo dígitos (para guardar el teléfono normalizado). */
export const phoneDigits = (v?: string | null) => (v ?? '').replace(/\D/g, '');

export function isValidPhone(v?: string | null) {
  const raw = (v ?? '').trim();
  if (!raw) return true; // opcional
  if (!/^\+?[\d\s().-]+$/.test(raw)) return false;
  const n = phoneDigits(raw).length;
  return n >= PHONE_MIN_DIGITS && n <= PHONE_MAX_DIGITS;
}

export const isValidEmail = (v?: string | null) => {
  const raw = (v ?? '').trim();
  return raw === '' || EMAIL_RE.test(raw);
};

/** Teléfono con código de país (5493425482222, +54 9 342 548-2222) → https://wa.me/<dígitos>. */
export function phoneLink(v?: string | null): string | null {
  const raw = (v ?? '').trim();
  return raw && isValidPhone(raw) ? `https://wa.me/${phoneDigits(raw)}` : null;
}

/** URL o dominio (instagram.com/evesai, https://…) → esa URL. Un @usuario suelto no se puede resolver (no se sabe la red). */
export function socialLink(v?: string | null): string | null {
  const raw = (v ?? '').trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    const okProtocol = url.protocol === 'https:' || url.protocol === 'http:';
    const looksLikeDomain = /^[^.]+(\.[^.]+)+$/.test(url.hostname);
    return okProtocol && looksLikeDomain ? url.toString() : null;
  } catch {
    return null;
  }
}

export function emailLink(v?: string | null): string | null {
  const raw = (v ?? '').trim();
  return raw && EMAIL_RE.test(raw) ? `mailto:${raw}` : null;
}

export interface ContactChannels {
  phone: string;
  social: string;
  email: string;
}

/**
 * Reparte un "medio de contacto" viejo (un único texto, a veces "tel / insta") en los tres campos.
 * Cada parte se clasifica: email si tiene @ con dominio, teléfono si son dígitos, y el resto es red social.
 */
export function splitContactMethod(raw?: string | null): ContactChannels {
  const out: ContactChannels = { phone: '', social: '', email: '' };
  for (const part of (raw ?? '').split(/\s+\/\s+|[;|]/).map((p) => p.trim()).filter(Boolean)) {
    if (EMAIL_RE.test(part)) out.email ||= part;
    else if (isValidPhone(part)) out.phone ||= phoneDigits(part);
    else out.social ||= part;
  }
  return out;
}

/** Contactos guardados antes de separar los campos: se completan al leerlos. */
export function withChannels<T extends { contactMethod?: string; phone?: string; social?: string; email?: string }>(c: T): T {
  if (c.phone || c.social || c.email || !c.contactMethod) return c;
  return { ...c, ...splitContactMethod(c.contactMethod) };
}
