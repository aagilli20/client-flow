'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage } from '@/lib/auth/types';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/auth/demo-auth';
import { Field, Spinner } from '@/components/app/shared';

type View = 'login' | 'register' | 'forgot';

const emailSchema = z.string().trim().min(1, 'Ingresá tu email').email('El email no es válido');
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Ingresá tu contraseña') });
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá tu nombre'),
  email: emailSchema,
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
const forgotSchema = z.object({ email: emailSchema });

const TITLES: Record<View, string> = { login: 'Entrar', register: 'Crear tu cuenta', forgot: 'Recuperar contraseña' };

export default function AuthPage() {
  const { user, loading, mode } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const [view, setView] = useState<View>('login');

  useEffect(() => {
    if (!loading && user) router.replace(`/${locale}/dashboard`);
  }, [user, loading, router, locale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/70 p-4">
      <div className="w-full max-w-sm">
        <Link href={`/${locale}`} className="mb-8 flex items-center justify-center gap-2.5 text-2xl font-bold tracking-tight">
          <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-full" />
          ClientFlow
        </Link>

        <div className="card flex flex-col gap-5 p-6 sm:p-7">
          {view === 'forgot' && (
            <button
              onClick={() => setView('login')}
              className="-mb-2 flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight">{TITLES[view]}</h1>

          {view === 'login' && <LoginForm onSwitch={setView} demo={mode === 'demo'} />}
          {view === 'register' && <RegisterForm onSwitch={setView} />}
          {view === 'forgot' && <ForgotForm />}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">ClientFlow — Seguimiento de clientes y equipo</p>
      </div>
    </div>
  );
}

function PasswordInput({
  id,
  autoComplete,
  invalid,
  ...rest
}: { id: string; autoComplete: string; invalid?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className={`input-field pr-10 ${invalid ? 'input-error' : ''}`}
        {...rest}
      />
      <button
        type="button"
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

function LoginForm({ onSwitch, demo }: { onSwitch: (v: View) => void; demo: boolean }) {
  const { signIn } = useAuth();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const submit = handleSubmit(async ({ email, password }) => {
    setError('');
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            aria-invalid={!!errors.email}
            className={`input-field ${errors.email ? 'input-error' : ''}`}
            {...register('email')}
          />
        </Field>
        <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" invalid={!!errors.password} {...register('password')} />
        </Field>
        {error && <FormError message={error} />}
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting && <Spinner />} Entrar
        </button>
      </form>

      {demo && (
        <button
          type="button"
          onClick={() => {
            setValue('email', DEMO_EMAIL);
            setValue('password', DEMO_PASSWORD);
            void submit();
          }}
          className="btn-ghost w-full"
        >
          Entrar con la cuenta demo
        </button>
      )}

      <button onClick={() => onSwitch('forgot')} className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        ¿Olvidaste tu contraseña?
      </button>
      <p className="border-t pt-4 text-center text-sm text-muted-foreground">
        ¿Todavía no tenés cuenta?{' '}
        <button onClick={() => onSwitch('register')} className="font-semibold text-foreground underline-offset-4 hover:underline">
          Crear cuenta
        </button>
      </p>
    </>
  );
}

function RegisterForm({ onSwitch }: { onSwitch: (v: View) => void }) {
  const { signUp } = useAuth();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '' } });

  const submit = handleSubmit(async ({ name, email, password }) => {
    setError('');
    try {
      await signUp(name, email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Tu nombre" htmlFor="name" error={errors.name?.message}>
          <input id="name" autoComplete="name" placeholder="María García" aria-invalid={!!errors.name} className={`input-field ${errors.name ? 'input-error' : ''}`} {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" placeholder="tu@email.com" aria-invalid={!!errors.email} className={`input-field ${errors.email ? 'input-error' : ''}`} {...register('email')} />
        </Field>
        <Field label="Contraseña" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="new-password" placeholder="Mínimo 6 caracteres" invalid={!!errors.password} {...register('password')} />
        </Field>
        {error && <FormError message={error} />}
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting && <Spinner />} Crear cuenta
        </button>
      </form>
      <p className="border-t pt-4 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{' '}
        <button onClick={() => onSwitch('login')} className="font-semibold text-foreground underline-offset-4 hover:underline">
          Entrar
        </button>
      </p>
    </>
  );
}

function ForgotForm() {
  const { resetPassword } = useAuth();
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const submit = handleSubmit(async ({ email }) => {
    setError('');
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  if (sent) {
    return (
      <p role="status" className="rounded-lg bg-green-50 px-3 py-3 text-sm text-green-800">
        Si existe una cuenta con ese email, el link de recuperación llegará en breve.
      </p>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Escribí tu email y te enviamos un link para definir una nueva contraseña.</p>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input id="email" type="email" autoComplete="email" placeholder="tu@email.com" aria-invalid={!!errors.email} className={`input-field ${errors.email ? 'input-error' : ''}`} {...register('email')} />
      </Field>
      {error && <FormError message={error} />}
      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting && <Spinner />} Enviar link
      </button>
    </form>
  );
}
