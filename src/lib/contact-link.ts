/**
 * Convierte el "medio de contacto" en un link:
 *  - teléfono con código de país (5493425482222, +54 9 342 548-2222) → https://wa.me/<dígitos>
 *  - URL o dominio (instagram.com/evesai, https://…) → esa URL
 *  - cualquier otra cosa → null (no se puede abrir)
 * Solo se admiten http/https: nunca javascript: u otros esquemas.
 */
export function contactLink(method?: string | null): string | null {
  const raw = (method ?? '').trim();
  if (!raw) return null;

  // Solo dígitos y separadores habituales de teléfono.
  if (/^\+?[\d\s().-]+$/.test(raw)) {
    const digits = raw.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
  }

  // Dominio con o sin esquema, sin espacios.
  if (/\s/.test(raw)) return null;
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
