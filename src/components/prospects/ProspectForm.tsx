'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink } from 'lucide-react';
import { emailLink, phoneLink, socialLink } from '@/lib/contact-link';
import { Field, Spinner } from '@/components/app/shared';
import {
  CATEGORIES,
  LABELS,
  RESULTS,
  STAGES,
  TEMPERATURES,
  contactInputSchema,
  type Contact,
  type ContactInput,
} from '@/lib/types';

const DEFAULTS: ContactInput = {
  name: '',
  phone: '',
  social: '',
  email: '',
  category: 'negocio',
  temperature: 'tibio',
  stage: 'conversacion',
  result: 'abierto',
  notes: '',
  nextAction: '',
  nextActionDate: '',
};

export default function ProspectForm({
  contact,
  onSubmit,
  onCancel,
}: {
  contact?: Contact;
  onSubmit: (data: ContactInput) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactInputSchema),
    defaultValues: contact
      ? {
          ...DEFAULTS,
          name: contact.name,
          phone: contact.phone ?? '',
          social: contact.social ?? '',
          email: contact.email ?? '',
          category: contact.category,
          temperature: contact.temperature,
          stage: contact.stage,
          result: contact.result,
          notes: contact.notes ?? '',
          nextAction: contact.nextAction ?? '',
          nextActionDate: contact.nextActionDate ?? '',
        }
      : DEFAULTS,
  });

  const phoneHref = phoneLink(watch('phone'));
  const socialHref = socialLink(watch('social'));
  const emailHref = emailLink(watch('email'));
  const cls = (e?: unknown) => `input-field ${e ? 'input-error' : ''}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 pb-4">
      <Field label="Nombre" htmlFor="pf-name" error={errors.name?.message}>
        <input id="pf-name" autoFocus placeholder="Ej. Lucía Fernández" aria-invalid={!!errors.name} className={cls(errors.name)} {...register('name')} />
      </Field>
      <Field label="Teléfono" htmlFor="pf-phone" error={errors.phone?.message} hint="Con código de país, sin espacios (5493425482222). El botón abre WhatsApp.">
        <div className="flex gap-2">
          <input id="pf-phone" type="tel" inputMode="tel" placeholder="5493425482222" aria-invalid={!!errors.phone} className={cls(errors.phone)} {...register('phone')} />
          <GoButton href={phoneHref} title="Abrir en WhatsApp" empty="Ingresá un teléfono válido" />
        </div>
      </Field>
      <Field label="Red social" htmlFor="pf-social" error={errors.social?.message} hint="Link o dominio (instagram.com/usuario).">
        <div className="flex gap-2">
          <input id="pf-social" placeholder="instagram.com/usuario" aria-invalid={!!errors.social} className={cls(errors.social)} {...register('social')} />
          <GoButton href={socialHref} title="Abrir enlace" empty="Ingresá un link válido (instagram.com/usuario)" />
        </div>
      </Field>
      <Field label="Email" htmlFor="pf-email" error={errors.email?.message}>
        <div className="flex gap-2">
          <input id="pf-email" type="email" inputMode="email" placeholder="nombre@dominio.com" aria-invalid={!!errors.email} className={cls(errors.email)} {...register('email')} />
          <GoButton href={emailHref} title="Escribir un email" empty="Ingresá un email válido" />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría" htmlFor="pf-category">
          <select id="pf-category" className="input-field" {...register('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{LABELS.category[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Temperatura" htmlFor="pf-temp">
          <select id="pf-temp" className="input-field" {...register('temperature')}>
            {TEMPERATURES.map((c) => (
              <option key={c} value={c}>{LABELS.temperature[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Etapa" htmlFor="pf-stage">
          <select id="pf-stage" className="input-field" {...register('stage')}>
            {STAGES.map((c) => (
              <option key={c} value={c}>{LABELS.stage[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Resultado" htmlFor="pf-result">
          <select id="pf-result" className="input-field" {...register('result')}>
            {RESULTS.map((c) => (
              <option key={c} value={c}>{LABELS.result[c]}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Próxima acción" htmlFor="pf-next" error={errors.nextAction?.message}>
        <input id="pf-next" placeholder="Ej. Enviar la propuesta" className={cls(errors.nextAction)} {...register('nextAction')} />
      </Field>
      <Field label="Fecha del próximo seguimiento" htmlFor="pf-date" error={errors.nextActionDate?.message}>
        <input id="pf-date" type="date" className={cls(errors.nextActionDate)} {...register('nextActionDate')} />
      </Field>
      <Field label="Notas" htmlFor="pf-notes" error={errors.notes?.message}>
        <textarea id="pf-notes" rows={4} placeholder="Contexto, objeciones, intereses…" className={cls(errors.notes)} {...register('notes')} />
      </Field>

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-ghost">
          Cancelar
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting && <Spinner />} {contact ? 'Guardar cambios' : 'Crear prospecto'}
        </button>
      </div>
    </form>
  );
}

function GoButton({ href, title, empty }: { href: string | null; title: string; empty: string }) {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0" title={title}>
      Ir <ExternalLink className="h-3.5 w-3.5" />
    </a>
  ) : (
    <span aria-disabled="true" className="btn-ghost shrink-0 cursor-not-allowed opacity-50" title={empty}>
      Ir <ExternalLink className="h-3.5 w-3.5" />
    </span>
  );
}
