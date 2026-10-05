'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut } from 'lucide-react';
import { ErrorState, Field, PageHeader, Skeleton, Spinner } from '@/components/app/shared';
import { useToast } from '@/components/app/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { errorText, useRepo } from '@/contexts/DataContext';
import { settingsSchema, type SettingsInput } from '@/lib/types';

export default function SettingsView() {
  const repo = useRepo();
  const { user, signOut, mode } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsInput>({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    repo
      .getSettings()
      .then((s) =>
        reset({
          displayName: s.displayName || user?.displayName || '',
          sponsorName: s.sponsorName ?? '',
          goalConversations: s.goals.conversations,
          goalFollowUps: s.goals.followUps,
          goalPosts: s.goals.posts,
        }),
      )
      .catch((e: unknown) => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, [repo, reset, user?.displayName]);

  const save = handleSubmit(async (v) => {
    try {
      await repo.saveSettings({
        displayName: v.displayName,
        sponsorName: v.sponsorName ?? '',
        goals: { conversations: v.goalConversations, followUps: v.goalFollowUps, posts: v.goalPosts },
      });
      reset(v);
      toast.success('Configuración guardada');
    } catch (e) {
      toast.error(errorText(e));
    }
  });

  const cls = (e?: unknown) => `input-field ${e ? 'input-error' : ''}`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Configuración" description="Tu perfil y las metas diarias que cierran tus anillos." />

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <Skeleton className="h-96" />
      ) : (
        <form onSubmit={save} noValidate className="space-y-6">
          <section className="card space-y-4 p-5 sm:p-6">
            <h2 className="section-label">Perfil</h2>
            <Field label="Tu nombre" htmlFor="st-name" error={errors.displayName?.message}>
              <input id="st-name" autoComplete="name" aria-invalid={!!errors.displayName} className={cls(errors.displayName)} {...register('displayName')} />
            </Field>
            <Field label="Email" htmlFor="st-email" hint="El email de acceso no se puede cambiar desde aquí.">
              <input id="st-email" value={user?.email ?? ''} disabled readOnly className="input-field" />
            </Field>
            <Field label="Tu sponsor" htmlFor="st-sponsor" hint="Se usa en el texto de la rendición de cuentas." error={errors.sponsorName?.message}>
              <input id="st-sponsor" placeholder="Nombre de quien te acompaña" className={cls(errors.sponsorName)} {...register('sponsorName')} />
            </Field>
          </section>

          <section className="card space-y-4 p-5 sm:p-6">
            <h2 className="section-label">Metas diarias</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Conversaciones" htmlFor="st-g1" error={errors.goalConversations?.message}>
                <input id="st-g1" type="number" inputMode="numeric" min={1} className={cls(errors.goalConversations)} {...register('goalConversations')} />
              </Field>
              <Field label="Seguimientos" htmlFor="st-g2" error={errors.goalFollowUps?.message}>
                <input id="st-g2" type="number" inputMode="numeric" min={1} className={cls(errors.goalFollowUps)} {...register('goalFollowUps')} />
              </Field>
              <Field label="Publicaciones" htmlFor="st-g3" error={errors.goalPosts?.message}>
                <input id="st-g3" type="number" inputMode="numeric" min={1} className={cls(errors.goalPosts)} {...register('goalPosts')} />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">Cuando llegás a la meta de las tres, el día cuenta como completo y suma a tu racha.</p>
          </section>

          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary">
              {isSubmitting && <Spinner />} Guardar cambios
            </button>
          </div>
        </form>
      )}

      <section className="card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-semibold">Sesión</h2>
          <p className="text-sm text-muted-foreground">{mode === 'demo' ? 'Modo demo: los datos viven solo en este navegador.' : `Conectado como ${user?.email}`}</p>
        </div>
        <button
          className="btn-ghost"
          onClick={async () => {
            await signOut();
            router.replace(`/${locale}/auth`);
          }}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </section>
    </div>
  );
}
