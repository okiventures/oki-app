import type { SupabaseClient } from '@supabase/supabase-js';

type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

export function createMockSupabase(overrides?: DeepPartial<SupabaseClient>): SupabaseClient {
  const auth = {
    signUp: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
    verifyOtp: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
    updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
  };

  const from = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  return {
    auth: auth as any,
    from: from as any,
    ...(overrides as any),
  } as unknown as SupabaseClient;
}

export const supabaseMockModule = {
  supabase: createMockSupabase(),
};
