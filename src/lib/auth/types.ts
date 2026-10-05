export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/** Códigos de error normalizados (los mismos que usa Firebase Auth). */
export type AuthErrorCode =
  | 'auth/invalid-credential'
  | 'auth/email-already-in-use'
  | 'auth/invalid-email'
  | 'auth/weak-password'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed'
  | 'auth/unknown';

export const AUTH_MESSAGES: Record<AuthErrorCode, string> = {
  'auth/invalid-credential': 'Email o contraseña incorrectos.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Probá de nuevo en unos minutos.',
  'auth/network-request-failed': 'Sin conexión. Revisá tu internet e intentá otra vez.',
  'auth/unknown': 'Ocurrió un error inesperado. Intentá nuevamente.',
};

export function authErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code as AuthErrorCode | undefined;
  // Firebase devuelve user-not-found / wrong-password en proyectos sin "email enumeration protection".
  if (code === ('auth/user-not-found' as AuthErrorCode) || code === ('auth/wrong-password' as AuthErrorCode)) {
    return AUTH_MESSAGES['auth/invalid-credential'];
  }
  return AUTH_MESSAGES[code ?? 'auth/unknown'] ?? AUTH_MESSAGES['auth/unknown'];
}

/** Contrato que implementan Firebase Auth y el modo demo. La UI solo conoce esto. */
export interface AuthBackend {
  readonly mode: 'firebase' | 'demo';
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
}
