import { describe, expect, it } from 'vitest';
import { emailLink, isValidEmail, isValidPhone, phoneDigits, phoneLink, socialLink, splitContactMethod, withChannels } from '@/lib/contact-link';

type Ch = { contactMethod?: string; phone?: string };

describe('phoneLink', () => {
  it('teléfono → wa.me', () => {
    expect(phoneLink('5493425482222')).toBe('https://wa.me/5493425482222');
    expect(phoneLink('+54 9 342 548-2222')).toBe('https://wa.me/5493425482222');
  });
  it('inválidos → null', () => {
    for (const v of ['', '  ', undefined, null, 'WhatsApp', '12345', '123456789012345678', '54934abc']) expect(phoneLink(v), String(v)).toBeNull();
  });
  it('validación: vacío es válido (opcional)', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('5493425482222')).toBe(true);
    expect(isValidPhone('hola')).toBe(false);
    expect(phoneDigits('+54 9 (342) 548-2222')).toBe('5493425482222');
  });
});

describe('socialLink', () => {
  it('dominio o URL → esa URL', () => {
    expect(socialLink('instagram.com/evesai')).toBe('https://instagram.com/evesai');
    expect(socialLink('https://www.facebook.com/ana.perez')).toBe('https://www.facebook.com/ana.perez');
  });
  it('no abribles → null (incluye esquemas peligrosos)', () => {
    for (const v of ['', undefined, null, '@evesai', 'evesai', 'mi amigo ana.com', 'javascript:alert(1)', 'ftp://x.com/a']) expect(socialLink(v), String(v)).toBeNull();
  });
});

describe('emailLink', () => {
  it('mailto para emails válidos', () => {
    expect(emailLink('ana@example.com')).toBe('mailto:ana@example.com');
    expect(emailLink('ana@')).toBeNull();
    expect(emailLink('')).toBeNull();
    expect(isValidEmail('')).toBe(true);
    expect(isValidEmail('ana@example')).toBe(false);
  });
});

describe('splitContactMethod (datos anteriores)', () => {
  it('reparte "tel / insta / mail" en los tres campos', () => {
    expect(splitContactMethod('5493425482222 / instagram.com/evesai')).toEqual({ phone: '5493425482222', social: 'instagram.com/evesai', email: '' });
    expect(splitContactMethod('+54 9 342 548-2222 / ana@example.com')).toEqual({ phone: '5493425482222', social: '', email: 'ana@example.com' });
  });
  it('un único valor va al campo que corresponde', () => {
    expect(splitContactMethod('instagram.com/evesai').social).toBe('instagram.com/evesai');
    expect(splitContactMethod('WhatsApp').social).toBe('WhatsApp');
    expect(splitContactMethod('').phone).toBe('');
  });
  it('withChannels migra solo si faltan los nuevos campos', () => {
    expect(withChannels<Ch>({ contactMethod: '5493425482222' }).phone).toBe('5493425482222');
    expect(withChannels<Ch>({ contactMethod: '5493425482222', phone: '111' }).phone).toBe('111');
    expect(withChannels<Ch>({}).phone).toBeUndefined();
  });
});
