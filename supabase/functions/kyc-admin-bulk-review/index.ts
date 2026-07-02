const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) throw new Error('Missing required env vars');

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};
const cors = (h?: Record<string, string>) => ({ ...CORS, ...h });
const err = (s: number, b: Record<string, unknown>) =>
  new Response(JSON.stringify(b), { status: s, headers: cors() });
const ok = (b: Record<string, unknown>) =>
  new Response(JSON.stringify(b), {
    status: 200,
    headers: cors({ 'Content-Type': 'application/json' }),
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return err(405, { error: 'METHOD_NOT_ALLOWED' });

  const ah = req.headers.get('Authorization');
  if (!ah) return err(401, { error: 'UNAUTHORIZED', message: 'Authentication required' });
  const ur = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: ah, apikey: ANON_KEY },
  });
  if (!ur.ok) return err(401, { error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  const uid = (await ur.json()).id;

  const pr = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(uid)}&select=user_type`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const p = await pr.json();
  if (!Array.isArray(p) || p.length === 0 || p[0].user_type !== 'admin')
    return err(403, { error: 'FORBIDDEN', message: 'Admin access required' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err(400, { error: 'BAD_REQUEST', message: 'Invalid JSON body' });
  }
  const hmId = body.handyman_id as string;
  const action = body.action as string;
  const reason = body.reason as string | undefined;
  if (!hmId) return err(400, { error: 'VALIDATION_ERROR', message: 'handyman_id is required' });
  if (!action || !['APPROVE', 'REJECT'].includes(action))
    return err(400, { error: 'VALIDATION_ERROR', message: 'action must be APPROVE or REJECT' });

  const dr = await fetch(
    `${SUPABASE_URL}/rest/v1/kyc_documents?handyman_id=eq.${encodeURIComponent(hmId)}&status=eq.PENDING&select=id`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const pd = await dr.json();
  const ids: string[] = Array.isArray(pd) ? pd.map((d: any) => d.id) : [];
  if (ids.length === 0)
    return err(422, {
      error: 'INVALID_STATE',
      message: 'No PENDING documents found for this handyman',
    });

  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const now = new Date().toISOString();
  const rr = action === 'REJECT' ? (reason ?? null) : null;

  await Promise.all(
    ids.map((id) =>
      fetch(`${SUPABASE_URL}/rest/v1/kyc_documents?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          status: newStatus,
          reviewed_by: uid,
          reviewed_at: now,
          rejection_reason: rr,
        }),
      })
    )
  );

  await fetch(`${SUPABASE_URL}/rest/v1/handymen?id=eq.${encodeURIComponent(hmId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ kyc_status: newStatus }),
  });

  return ok({
    success: true,
    handyman_id: hmId,
    documents_reviewed: ids.length,
    action,
    message: `${ids.length} document(s) ${newStatus.toLowerCase()}`,
  });
});
