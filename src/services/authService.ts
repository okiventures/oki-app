import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

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
  companyName?: string;
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

  if (payload.companyName) {
    metadata.company_name = payload.companyName;
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

// ─── One-Time Codes (Email / SMS OTP) ────────────────────────────────────────

export async function sendEmailOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(error.message);
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw new Error(error.message);
}

export async function verifyOtp(params: { email?: string; phone?: string; token: string }) {
  const { email, phone, token } = params;
  if (!email && !phone) {
    throw new Error('Either email or phone is required for OTP verification');
  }

  const otpRequest = email
    ? { email, token, type: 'email' as const }
    : { phone: phone!, token, type: 'sms' as const };

  const { data, error } = await supabase.auth.verifyOtp(otpRequest);
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('No session returned from OTP verification');

  return formatSession(data.session);
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL('/login');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error('No OAuth URL returned from provider');

  // Open the provider consent screen in the system browser and wait for the
  // redirect back to the app (oki://login?code=...).
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'success' && result.url) {
    const code = new URL(result.url).searchParams.get('code');
    if (code) {
      // Exchange the PKCE auth code for a session (also persists it via the
      // configured secure storage).
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw new Error(exchangeError.message);
    }
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{ emailSent: boolean }> {
  // Redirect the user back to the app's reset password screen via deep link.
  // The email template must include: {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'oki://reset-password',
  });

  if (error) throw new Error(error.message);

  // If no error, the request was accepted — the email provider (Resend) will deliver it.
  // Supabase returns { data: {}, error: null } on success (empty data object),
  // so checking Object.keys(data).length always returns false. Just check !error instead.
  return { emailSent: true };
}

export async function confirmPasswordReset(token_hash: string, newPassword: string) {
  // Verify the token_hash from the email link (oki://reset-password?token_hash=XXX)
  const { error: verifyError, data: verifyData } = await supabase.auth.verifyOtp({
    token_hash,
    type: 'recovery',
  });
  if (verifyError) throw new Error(verifyError.message);

  // After successful verifyOtp, the user should have a recovery session.
  // If verifyOtp returned a session, set it explicitly to ensure updateUser works.
  if (verifyData?.session) {
    await supabase.auth.setSession(verifyData.session);
  }

  // Set the new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) throw new Error(updateError.message);

  // Retrieve the session after password change
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Failed to retrieve session after password reset');
  }

  return formatSession(sessionData.session);
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function ensureUserProfile(params: {
  userId: string;
  email?: string;
  phone?: string;
  fullName: string;
  userType: 'client' | 'handyman' | 'admin';
}): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('users')
      .select('id, user_type')
      .eq('id', params.userId)
      .maybeSingle();

    if (!existing) {
      // No user row yet — create it (trigger may also do this, but we ensure it)
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
    } else if (existing.user_type !== params.userType) {
      // User exists but with wrong type (e.g., trigger defaulted to 'client')
      // Update to the correct type
      const { error: updateError } = await supabase
        .from('users')
        .update({ user_type: params.userType })
        .eq('id', params.userId);

      if (updateError) {
        console.error('Failed to update user_type:', updateError.message);
      }
    }

    // Ensure handyman profile row exists for handyman users
    if (params.userType === 'handyman') {
      const { data: existingHandyman } = await supabase
        .from('handymen')
        .select('id')
        .eq('id', params.userId)
        .maybeSingle();

      if (!existingHandyman) {
        const { error: handymanError } = await supabase.from('handymen').insert({
          id: params.userId,
        });
        if (handymanError) {
          console.error('Failed to create handyman profile:', handymanError.message);
        }
      }
    }
  } catch (err) {
    console.error('Error ensuring user profile:', err);
  }
}
