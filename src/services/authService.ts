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
      // No user row yet — create it. handle_new_user() normally does this; the
      // insert is a backstop. 'admin' is never self-assignable, so a requested
      // admin signup lands as a client here exactly as the trigger would do it.
      const { error: insertError } = await supabase.from('users').insert({
        id: params.userId,
        email: params.email || params.phone || `${params.userId}@oki.app`,
        phone: params.phone || null,
        full_name: params.fullName,
        user_type: params.userType === 'handyman' ? 'handyman' : 'client',
      });

      if (insertError) {
        console.error('Failed to create user profile:', insertError.message);
        return;
      }
    }

    // NOTE: no user_type reconciliation here. handle_new_user() deliberately
    // collapses any self-asserted role other than 'handyman' down to 'client';
    // patching the row back to the requested type from the client would undo
    // that and hand out admin to anyone who posts user_type: 'admin'. Admins are
    // provisioned out-of-band with the service role.

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
