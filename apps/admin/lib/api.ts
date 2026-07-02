import { createBrowserClient } from './supabase/client';

const EDGE_FUNCTION_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL ??
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string>;
}

async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const client = createBrowserClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${EDGE_FUNCTION_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await res.json();

  if (!res.ok) {
    const err = body as ApiError;
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }

  return body as T;
}

export const kycApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return fetchWithAuth(`/kyc-admin-list?${query.toString()}`);
  },

  review: (documentId: string, action: 'APPROVE' | 'REJECT', reason?: string) =>
    fetchWithAuth(`/kyc-admin-review/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, reason }),
    }),
};
