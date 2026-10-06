'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink } from 'lucide-react';
import { contactLink } from '@/lib/contact-link';
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
  contactMethod: '',
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
          contactMethod: contact.contactMethod ?? '',
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

  const link = contactLink(watch('contactMethod'));
  const cls = (e?: unknown) => `input-field ${e ? 'input-error' : ''}`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 pb-4">
      <Field label="Nombre" htmlFor="pf-name" error={errors.name?.message}>
        <input id="pf-name" autoFocus placeholder="Ej. Lucía Fernández" aria-invalid={!!errors.name} className={cls(errors.name)} {...register('name')} />
      </Field>
      <Field
        label="Medio de contacto"
        htmlFor="pf-method"
        error={errors.contactMethod?.message}
        hint="Teléfono con código de país (5493425482222) o link (instagram.com/usuario)."
      >
        <div className="flex gap-2">
          <input id="pf-method" placeholder="5493425482222 o instagram.com/usuario" className={cls(errors.contactMethod)} {...register('contactMethod')} />
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn-ghost shrink-0" title={link}>
              Ir <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span aria-disabled="true" className="btn-ghost shrink-0 cursor-not-allowed opacity-50" title="Ingresá un teléfono o un link válido">
              Ir <ExternalLink className="h-3.5 w-3.5" />
            </span>
          )}
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
