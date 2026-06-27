import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../services/authService';
import type { SignupResult } from '../services/authService';

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  user: {
    id: string;
    email?: string;
    phone?: string;
    userType?: 'client' | 'handyman' | 'admin';
  };
}

interface AuthContextType {
  session: AuthSession | null;
  isLoading: boolean;
  isSigningIn: boolean;
  isSigningUp: boolean;
  error: string | null;
  signup: (params: {
    email?: string;
    phone?: string;
    password: string;
    userType: 'client' | 'handyman' | 'admin';
    fullName: string;
    companyCode?: string;
  }) => Promise<SignupResult>;
  login: (params: { email?: string; phone?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function formatSessionFromSupabase(supabaseSession: any): AuthSession | null {
  if (!supabaseSession?.access_token) return null;

  const expiresAt = supabaseSession.expires_at
    ? new Date(supabaseSession.expires_at).getTime() / 1000
    : Date.now() / 1000 + (supabaseSession.expires_in ?? 3600);

  return {
    accessToken: supabaseSession.access_token,
    refreshToken: supabaseSession.refresh_token,
    expiresIn: supabaseSession.expires_in ?? 3600,
    expiresAt: Math.floor(expiresAt),
    user: {
      id: supabaseSession.user?.id,
      email: supabaseSession.user?.email,
      phone: supabaseSession.user?.phone,
      userType: supabaseSession.user?.user_metadata?.user_type,
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bootstrap: check for existing session, then listen for changes
  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(formatSessionFromSupabase(data.session));
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    // 2. Listen for future auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (mounted) {
        setSession(formatSessionFromSupabase(supabaseSession));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignup = useCallback(
    async (params: {
      email?: string;
      phone?: string;
      password: string;
      userType: 'client' | 'handyman' | 'admin';
      fullName: string;
      companyCode?: string;
    }) => {
      setIsSigningUp(true);
      setError(null);
      try {
        const result = await authService.signup(params);
        if (result.session) {
          setSession(result.session);
        }
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Signup failed';
        setError(message);
        throw e;
      } finally {
        setIsSigningUp(false);
      }
    },
    []
  );

  const handleLogin = useCallback(
    async (params: { email?: string; phone?: string; password: string }) => {
      setIsSigningIn(true);
      setError(null);
      try {
        const newSession = await authService.login(params);
        setSession(newSession);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Login failed';
        setError(message);
        throw e;
      } finally {
        setIsSigningIn(false);
      }
    },
    []
  );

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authService.logout();
      setSession(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Logout failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRequestPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await authService.requestPasswordReset(email);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Password reset request failed';
      setError(message);
      throw e;
    }
  }, []);

  const handleConfirmPasswordReset = useCallback(async (token: string, newPassword: string) => {
    setIsSigningIn(true);
    setError(null);
    try {
      const newSession = await authService.confirmPasswordReset(token, newPassword);
      setSession(newSession);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Password reset failed';
      setError(message);
      throw e;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    session,
    isLoading,
    isSigningIn,
    isSigningUp,
    error,
    signup: handleSignup,
    login: handleLogin,
    logout: handleLogout,
    requestPasswordReset: handleRequestPasswordReset,
    confirmPasswordReset: handleConfirmPasswordReset,
    clearError: handleClearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
