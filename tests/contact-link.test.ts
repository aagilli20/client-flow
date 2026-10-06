import { describe, expect, it } from 'vitest';
import { contactLink } from '@/lib/contact-link';

describe('contactLink', () => {
  it('teléfono → wa.me', () => {
    expect(contactLink('5493425482222')).toBe('https://wa.me/5493425482222');
    expect(contactLink('+54 9 342 548-2222')).toBe('https://wa.me/5493425482222');
  });
  it('dominio o URL → esa URL', () => {
    expect(contactLink('instagram.com/evesai')).toBe('https://instagram.com/evesai');
    expect(contactLink('https://www.facebook.com/ana.perez')).toBe('https://www.facebook.com/ana.perez');
  });
  it('valores no abribles → null', () => {
    for (const v of ['', '   ', undefined, null, 'WhatsApp', '@evesai', '12345', 'mi amigo ana.com', 'javascript:alert(1)', 'ftp://x.com/a']) {
      expect(contactLink(v), String(v)).toBeNull();
    }
  });
});
