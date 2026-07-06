import {
  signup,
  login,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  ensureUserProfile,
} from '../../src/services/authService';

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

const { supabase } = require('../../src/lib/supabase');

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
