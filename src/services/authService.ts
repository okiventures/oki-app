import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignupResult {
  session: {
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
  } | null;
  emailConfirmationRequired: boolean;
}

interface SignupPayload {
  email?: string;
  phone?: string;
  password: string;
  userType: 'client' | 'handyman' | 'admin';
  fullName: string;
  companyCode?: string;
}

interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSession(supabaseSession: any) {
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

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function signup(payload: SignupPayload): Promise<SignupResult> {
  const metadata: Record<string, unknown> = {
    full_name: payload.fullName,
    user_type: payload.userType,
  };

  if (payload.companyCode) {
    metadata.company_code = payload.companyCode;
  }

  const { data, error } = payload.email
    ? await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: { data: metadata },
      })
    : await supabase.auth.signUp({
        phone: payload.phone!,
        password: payload.password,
        options: { data: metadata },
      });

  if (error) throw new Error(error.message);

  const { user, session } = data;

  // Create user profile in public.users table
  if (user) {
    await ensureUserProfile({
      userId: user.id,
      email: payload.email || user.email,
      phone: payload.phone || user.phone,
      fullName: payload.fullName,
      userType: payload.userType,
    });
  }

  if (session) {
    return {
      session: formatSession(session),
      emailConfirmationRequired: false,
    };
  }

  return { session: null, emailConfirmationRequired: true };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(payload: LoginPayload) {
  const { data, error } = payload.email
    ? await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      })
    : await supabase.auth.signInWithPassword({
        phone: payload.phone!,
        password: payload.password,
      });

  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('No session returned from login');

  return formatSession(data.session);
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectUrl = Linking.createURL('/auth/reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  if (error) throw new Error(error.message);
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'recovery',
  });
  if (verifyError) throw new Error(verifyError.message);

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) throw new Error(updateError.message);

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Failed to retrieve session after password reset');
  }

  return formatSession(sessionData.session);
}

// ─── User Profile ─────────────────────────────────────────────────────────────

async function ensureUserProfile(params: {
  userId: string;
  email?: string;
  phone?: string;
  fullName: string;
  userType: 'client' | 'handyman' | 'admin';
}): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', params.userId)
      .maybeSingle();

    if (existing) return;

    const { error: insertError } = await supabase.from('users').insert({
      id: params.userId,
      email: params.email || params.phone || `${params.userId}@oki.app`,
      phone: params.phone || null,
      full_name: params.fullName,
      user_type: params.userType,
    });

    if (insertError) {
      console.error('Failed to create user profile:', insertError.message);
      return;
    }

    if (params.userType === 'handyman') {
      const { error: handymanError } = await supabase.from('handymen').insert({
        id: params.userId,
      });
      if (handymanError) {
        console.error('Failed to create handyman profile:', handymanError.message);
      }
    }
  } catch (err) {
    console.error('Error ensuring user profile:', err);
  }
}
