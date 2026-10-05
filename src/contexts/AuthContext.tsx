'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { demoAuthBackend } from '@/lib/auth/demo-auth';
import { firebaseAuthBackend } from '@/lib/auth/firebase-auth';
import type { AuthBackend, AuthUser } from '@/lib/auth/types';
import { isFirebaseConfigured } from '@/lib/firebase/config';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  mode: AuthBackend['mode'];
  signIn: AuthBackend['signIn'];
  signUp: AuthBackend['signUp'];
  signOut: AuthBackend['signOut'];
  resetPassword: AuthBackend['resetPassword'];
}

const backend: AuthBackend = isFirebaseConfigured ? firebaseAuthBackend : demoAuthBackend;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      backend.onChange((u) => {
        setUser(u);
        setLoading(false);
      }),
    [],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      mode: backend.mode,
      signIn: (email, password) => backend.signIn(email, password),
      signUp: (name, email, password) => backend.signUp(name, email, password),
      signOut: () => backend.signOut(),
      resetPassword: (email) => backend.resetPassword(email),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
