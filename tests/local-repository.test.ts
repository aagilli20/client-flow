import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalRepository, MemoryStore } from '@/lib/data/local-repository';
import type { Repository } from '@/lib/data/repository';
import { DEFAULT_SETTINGS, type NewDoc } from '@/lib/types';

const contact = (name: string): NewDoc<'contacts'> => ({
  name, category: 'negocio', temperature: 'tibio', stage: 'conversacion', result: 'abierto', followUpsCount: 0,
});

describe('repositorio local (modo demo)', () => {
  let store: MemoryStore;
  let repo: Repository;
  beforeEach(() => {
    store = new MemoryStore();
    repo = createLocalRepository('u1', store);
  });

  it('crea con userId y timestamps del servidor, y lista', async () => {
    const c = await repo.create('contacts', contact('Ana Pérez'));
    expect(c.id).toBeTruthy();
    expect(c.userId).toBe('u1');
    expect(c.createdAt).toMatch(/^\d{4}-/);
    expect(await repo.list('contacts')).toHaveLength(1);
  });

  it('edita y elimina', async () => {
    const c = await repo.create('contacts', contact('Ana Pérez'));
    await repo.update('contacts', c.id, { temperature: 'caliente' });
    expect((await repo.list('contacts'))[0]!.temperature).toBe('caliente');
    await repo.remove('contacts', c.id);
    expect(await repo.list('contacts')).toHaveLength(0);
  });

  it('editar un documento inexistente falla (estado de error)', async () => {
    await expect(repo.update('contacts', 'nope', { name: 'X' })).rejects.toMatchObject({ code: 'not-found' });
  });

  it('aísla los datos entre usuarios', async () => {
    await repo.create('contacts', contact('Solo de u1'));
    const other = createLocalRepository('u2', store);
    expect(await other.list('contacts')).toHaveLength(0);
    await other.create('contacts', contact('Solo de u2'));
    expect(await repo.list('contacts')).toHaveLength(1);
  });

  it('filtra por rango de fechas', async () => {
    const mk = (date: string) => repo.create('social_posts', { date, category: 'negocio' });
    await mk('2026-09-30');
    await mk('2026-10-01');
    await mk('2026-10-31');
    const oct = await repo.list('social_posts', { rangeField: 'date', from: '2026-10-01', to: '2026-10-31' });
    expect(oct.map((p) => p.date).sort()).toEqual(['2026-10-01', '2026-10-31']);
  });

  it('respeta max', async () => {
    for (let i = 0; i < 5; i++) await repo.create('contacts', contact(`Persona ${i}`));
    expect(await repo.list('contacts', { max: 3 })).toHaveLength(3);
  });

  it('incrementActivity crea y acumula por día, sin bajar de 0', async () => {
    await repo.incrementActivity('2026-10-04', 'followUps', 1);
    await repo.incrementActivity('2026-10-04', 'followUps', 2);
    await repo.incrementActivity('2026-10-04', 'posts', -1);
    const [a] = await repo.list('daily_activities');
    expect(a).toMatchObject({ id: 'u1_2026-10-04', date: '2026-10-04', followUps: 3, posts: 0, conversations: 0 });
  });

  it('configuración: valores por defecto y guardado parcial', async () => {
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS);
    await repo.saveSettings({ displayName: 'Ana', goals: { conversations: 5, followUps: 3, posts: 1 } });
    const s = await repo.getSettings();
    expect(s.displayName).toBe('Ana');
    expect(s.goals.conversations).toBe(5);
    expect(s.goals.followUps).toBe(3);
  });

  it('tolera datos corruptos en el almacenamiento', async () => {
    store.setItem('cf:u1:contacts', '{no-json');
    expect(await repo.list('contacts')).toEqual([]);
  });
});
