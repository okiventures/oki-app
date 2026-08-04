import {
  signup,
  login,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  ensureUserProfile,
  sendEmailOtp,
  sendPhoneOtp,
  verifyOtp,
  signInWithGoogle,
} from '../../src/services/authService';
import { supabase } from '../../src/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

jest.mock('../../src/lib/supabase', () => {
  const auth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    verifyOtp: jest.fn(),
    setSession: jest.fn(),
    updateUser: jest.fn(),
    getSession: jest.fn(),
    signInWithOtp: jest.fn(),
    signInWithOAuth: jest.fn(),
    exchangeCodeForSession: jest.fn(),
  };

  const from = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  });

  return { supabase: { auth, from } };
});

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'oki://login'),
}));

beforeEach(() => {
  jest.clearAllMocks();
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
});

// ─── signup ──────────────────────────────────────────────────────────────────

describe('signup', () => {
  const payload = {
    email: 'test@oki.test',
    password: 'Test@123',
    userType: 'client' as const,
    fullName: 'Test User',
  };

  it('returns session on successful signup with email', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'test@oki.test' },
        session: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          user: { id: 'u1', email: 'test@oki.test', user_metadata: {} },
        },
      },
      error: null,
    });

    const result = await signup(payload);

    expect(result.emailConfirmationRequired).toBe(false);
    expect(result.session).not.toBeNull();
    expect(result.session!.accessToken).toBe('at');
  });

  it('returns email confirmation required when no session', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@oki.test' }, session: null },
      error: null,
    });

    const result = await signup(payload);

    expect(result.emailConfirmationRequired).toBe(true);
    expect(result.session).toBeNull();
  });

  it('throws on supabase error', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Email taken' },
    });

    await expect(signup(payload)).rejects.toThrow('Email taken');
  });

  it('creates user profile on signup', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const insert = jest.fn().mockReturnValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert,
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
    });
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'test@oki.test' },
        session: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          user: { id: 'u1', email: 'test@oki.test', user_metadata: {} },
        },
      },
      error: null,
    });

    await signup(payload);

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', full_name: 'Test User', user_type: 'client' })
    );
  });

  it('creates handyman profile for handyman signup', async () => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const insert = jest.fn().mockReturnValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert,
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
    });
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'hm1', email: 'handyman@oki.test' },
        session: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          user: { id: 'hm1', email: 'handyman@oki.test', user_metadata: {} },
        },
      },
      error: null,
    });

    await signup({ ...payload, userType: 'handyman' });

    expect(supabase.from).toHaveBeenCalledWith('handymen');
  });
});

// ─── login ───────────────────────────────────────────────────────────────────

describe('login', () => {
  const payload = { email: 'test@oki.test', password: 'Test@123' };

  it('returns session on successful login', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          user: { id: 'u1', email: 'test@oki.test', user_metadata: { user_type: 'client' } },
        },
      },
      error: null,
    });

    const result = await login(payload);

    expect(result.accessToken).toBe('at');
    expect(result.refreshToken).toBe('rt');
    expect(result.user.id).toBe('u1');
    expect(result.user.userType).toBe('client');
  });

  it('throws on login error', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    await expect(login(payload)).rejects.toThrow('Invalid credentials');
  });

  it('throws when no session returned', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(login(payload)).rejects.toThrow('No session returned');
  });

  it('supports phone login', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          user: { id: 'u1', phone: '+639171234567', user_metadata: {} },
        },
      },
      error: null,
    });

    const result = await login({ phone: '+639171234567', password: 'Test@123' });

    expect(result.user.id).toBe('u1');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      phone: '+639171234567',
      password: 'Test@123',
    });
  });
});

// ─── logout ──────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('signs out successfully', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    await expect(logout()).resolves.toBeUndefined();
  });

  it('throws on signout error', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: { message: 'Network error' },
    });

    await expect(logout()).rejects.toThrow('Network error');
  });
});

// ─── requestPasswordReset ────────────────────────────────────────────────────

describe('requestPasswordReset', () => {
  it('returns emailSent true on success', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });

    const result = await requestPasswordReset('test@oki.test');

    expect(result.emailSent).toBe(true);
  });

  it('throws on error', async () => {
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      error: { message: 'Rate limit exceeded' },
    });

    await expect(requestPasswordReset('test@oki.test')).rejects.toThrow('Rate limit exceeded');
  });
});

// ─── confirmPasswordReset ────────────────────────────────────────────────────

describe('confirmPasswordReset', () => {
  it('completes full reset flow', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'at', refresh_token: 'rt' } },
      error: null,
    });
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({ data: {}, error: null });
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ data: {}, error: null });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: 'new_at',
          refresh_token: 'new_rt',
          expires_in: 3600,
          expires_at: Date.now() / 1000 + 3600,
          user: { id: 'u1', email: 'test@oki.test', user_metadata: {} },
        },
      },
      error: null,
    });

    const result = await confirmPasswordReset('token_hash_abc', 'NewPass@123');

    expect(result.accessToken).toBe('new_at');
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'token_hash_abc',
      type: 'recovery',
    });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NewPass@123' });
  });

  it('throws on verifyOtp error', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid token' },
    });

    await expect(confirmPasswordReset('bad_token', 'NewPass@123')).rejects.toThrow('Invalid token');
  });

  it('throws if getSession returns no session after reset', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: {},
      error: null,
    });
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ data: {}, error: null });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(confirmPasswordReset('token_hash', 'NewPass@123')).rejects.toThrow(
      'Failed to retrieve session'
    );
  });
});

// ─── ensureUserProfile ──────────────────────────────────────────────────────

describe('ensureUserProfile', () => {
  const params = {
    userId: 'u1',
    email: 'test@oki.test',
    fullName: 'Test User',
    userType: 'client' as const,
  };

  it('creates profile when user does not exist', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const insert = jest.fn().mockReturnValue({ error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert,
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
    });

    await ensureUserProfile(params);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'u1',
        email: 'test@oki.test',
        full_name: 'Test User',
        user_type: 'client',
      })
    );
  });

  it('updates user_type when type mismatch', async () => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValue({ data: { id: 'u1', user_type: 'client' }, error: null });
    const update = jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ error: null }) });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update,
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
    });

    await ensureUserProfile({ ...params, userType: 'handyman' });

    expect(update).toHaveBeenCalledWith({ user_type: 'handyman' });
  });

  it('skips when profile already correct', async () => {
    const maybeSingle = jest
      .fn()
      .mockResolvedValue({ data: { id: 'u1', user_type: 'client' }, error: null });

    const insert = jest.fn();
    const update = jest.fn();
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert,
      update,
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
    });

    await ensureUserProfile(params);

    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('creates handyman row for handyman users', async () => {
    const usersMaybeSingle = jest
      .fn()
      .mockResolvedValue({ data: { id: 'hm1', user_type: 'handyman' }, error: null });
    const handymenMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const insert = jest.fn().mockReturnValue({ error: null });

    const calls: string[] = [];
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      calls.push(table);
      return {
        select: jest.fn().mockReturnThis(),
        insert: table === 'handymen' ? insert : jest.fn().mockReturnValue({ error: null }),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: table === 'handymen' ? handymenMaybeSingle : usersMaybeSingle,
      };
    });

    await ensureUserProfile({ ...params, userType: 'handyman' });

    expect(insert).toHaveBeenCalledWith({ id: 'u1' });
  });

  it('skips handyman row when already exists', async () => {
    const usersMaybeSingle = jest
      .fn()
      .mockResolvedValue({ data: { id: 'hm1', user_type: 'handyman' }, error: null });
    const handymenMaybeSingle = jest.fn().mockResolvedValue({ data: { id: 'hm1' }, error: null });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: table === 'handymen' ? handymenMaybeSingle : usersMaybeSingle,
        insert: jest.fn(),
      };
    });

    await ensureUserProfile({ ...params, userType: 'handyman' });

    expect(supabase.from).toHaveBeenCalledWith('handymen');
  });
});

// ─── sendEmailOtp ────────────────────────────────────────────────────────────

describe('sendEmailOtp', () => {
  it('sends email OTP with shouldCreateUser', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ data: {}, error: null });

    await sendEmailOtp('test@oki.test');

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@oki.test',
      options: { shouldCreateUser: true },
    });
  });

  it('throws on error', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      data: {},
      error: { message: 'Email not allowed' },
    });

    await expect(sendEmailOtp('test@oki.test')).rejects.toThrow('Email not allowed');
  });
});

// ─── sendPhoneOtp ────────────────────────────────────────────────────────────

describe('sendPhoneOtp', () => {
  it('sends SMS OTP with phone', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({ data: {}, error: null });

    await sendPhoneOtp('09171234567');

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ phone: '09171234567' });
  });

  it('throws on error', async () => {
    (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
      data: {},
      error: { message: 'Phone not allowed' },
    });

    await expect(sendPhoneOtp('09171234567')).rejects.toThrow('Phone not allowed');
  });
});

// ─── verifyOtp ───────────────────────────────────────────────────────────────

describe('verifyOtp', () => {
  const session = {
    access_token: 'at',
    refresh_token: 'rt',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    user: { id: 'u1', email: 'test@oki.test', user_metadata: { user_type: 'client' } },
  };

  it('verifies email OTP and returns a formatted session', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { session },
      error: null,
    });

    const result = await verifyOtp({ email: 'test@oki.test', token: '123456' });

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'test@oki.test',
      token: '123456',
      type: 'email',
    });
    expect(result.accessToken).toBe('at');
    expect(result.user.email).toBe('test@oki.test');
  });

  it('verifies SMS OTP and returns a formatted session', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: { session: { ...session, user: { ...session.user, email: null } } },
      error: null,
    });

    const result = await verifyOtp({ phone: '09171234567', token: '654321' });

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '09171234567',
      token: '654321',
      type: 'sms',
    });
    expect(result.accessToken).toBe('at');
  });

  it('throws when neither email nor phone is provided', async () => {
    await expect(verifyOtp({ token: '123456' })).rejects.toThrow(
      'Either email or phone is required'
    );
  });

  it('throws on verifyOtp error', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid code' },
    });

    await expect(verifyOtp({ email: 'test@oki.test', token: '000000' })).rejects.toThrow(
      'Invalid code'
    );
  });

  it('throws when no session is returned', async () => {
    (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({ data: {}, error: null });

    await expect(verifyOtp({ email: 'test@oki.test', token: '123456' })).rejects.toThrow(
      'No session returned'
    );
  });
});

// ─── signInWithGoogle ────────────────────────────────────────────────────────

describe('signInWithGoogle', () => {
  it('opens browser and exchanges the auth code for a session', async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth/authorize?foo=bar' },
      error: null,
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'oki://login?code=auth-code-123',
    });
    (supabase.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
      data: { session: {} },
      error: null,
    });

    await signInWithGoogle();

    expect(Linking.createURL).toHaveBeenCalledWith('/login');
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'oki://login', skipBrowserRedirect: true },
    });
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://accounts.google.com/oauth/authorize?foo=bar',
      'oki://login'
    );
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth-code-123');
  });

  it('throws on signInWithOAuth error', async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: {},
      error: { message: 'Provider not enabled' },
    });

    await expect(signInWithGoogle()).rejects.toThrow('Provider not enabled');
  });

  it('throws when no OAuth URL is returned', async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: null },
      error: null,
    });

    await expect(signInWithGoogle()).rejects.toThrow('No OAuth URL returned');
  });

  it('throws when code exchange fails', async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth/authorize' },
      error: null,
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'oki://login?code=bad-code',
    });
    (supabase.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'Invalid code' },
    });

    await expect(signInWithGoogle()).rejects.toThrow('Invalid code');
  });

  it('does not exchange when browser flow is cancelled', async () => {
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth/authorize' },
      error: null,
    });
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });

    await signInWithGoogle();

    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
