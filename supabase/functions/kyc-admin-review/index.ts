const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) throw new Error('Missing required env vars');

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
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
const absUrl = (u: string | null) => (u?.startsWith('/') ? `${SUPABASE_URL}/storage/v1${u}` : u);
const enc = (p: string) =>
  p
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'PATCH') return err(405, { error: 'METHOD_NOT_ALLOWED' });

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

  const pu = new URL(req.url).pathname.split('/').filter(Boolean);
  const docId = pu[pu.length - 1];
  if (!docId || docId.length < 36)
    return err(400, { error: 'VALIDATION_ERROR', message: 'Invalid document ID' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err(400, { error: 'BAD_REQUEST', message: 'Invalid JSON body' });
  }
  const action = body.action as string;
  if (!action || !['APPROVE', 'REJECT'].includes(action))
    return err(400, {
      error: 'VALIDATION_ERROR',
      message: 'action must be APPROVE or REJECT',
      details: { field: 'action', issue: 'Invalid or missing' },
    });
  if (action === 'REJECT' && !body.reason)
    return err(400, {
      error: 'VALIDATION_ERROR',
      message: 'reason is required when action is REJECT',
      details: { field: 'reason', issue: 'Missing' },
    });

  const er = await fetch(
    `${SUPABASE_URL}/rest/v1/kyc_documents?id=eq.${encodeURIComponent(docId)}&select=*`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const ed = await er.json();
  const doc = Array.isArray(ed) && ed.length > 0 ? ed[0] : null;
  if (!doc) return err(404, { error: 'NOT_FOUND', message: 'KYC document not found' });
  if (doc.status !== 'PENDING')
    return err(422, { error: 'INVALID_STATE', message: `Document is already ${doc.status}` });

  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const now = new Date().toISOString();

  const up = await fetch(
    `${SUPABASE_URL}/rest/v1/kyc_documents?id=eq.${encodeURIComponent(docId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        status: newStatus,
        reviewed_by: uid,
        reviewed_at: now,
        rejection_reason: action === 'REJECT' ? (body.reason as string) : null,
      }),
    }
  );
  if (!up.ok) return err(500, { error: 'DATABASE_ERROR', message: 'Failed to update document' });
  const ud = await up.json();
  const updated = Array.isArray(ud) && ud.length > 0 ? ud[0] : null;
  if (!updated) return err(500, { error: 'DATABASE_ERROR', message: 'Failed to update document' });

  await fetch(`${SUPABASE_URL}/rest/v1/handymen?id=eq.${encodeURIComponent(doc.handyman_id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ kyc_status: newStatus }),
  });

  let signed: string | null = null;
  try {
    const sr = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/kyc-documents/${enc(updated.file_path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      }
    );
    if (sr.ok) {
      const sd = await sr.json();
      signed = absUrl(sd.signedURL ?? sd.signedUrl ?? null);
    }
  } catch {}

  const lr = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(updated.handyman_id)}&select=full_name,email`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const lu = lr.ok ? await lr.json() : [];
  const prof = Array.isArray(lu) && lu.length > 0 ? lu[0] : {};

  const uf =
    updated.document_type === 'GOVERNMENT_ID'
      ? 'front_id_url'
      : updated.document_type === 'SELFIE'
        ? 'selfie_url'
        : 'proof_of_address_url';

  return ok({
    id: updated.id,
    handyman_id: updated.handyman_id,
    handyman_name: prof.full_name ?? 'Unknown',
    handyman_email: prof.email ?? '',
    document_type: updated.document_type,
    [uf]: signed,
    status: updated.status,
    rejection_reason: updated.rejection_reason ?? null,
    submitted_at: updated.submitted_at,
    reviewed_at: updated.reviewed_at,
  });
});
