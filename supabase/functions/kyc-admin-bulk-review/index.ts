const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
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

const REQUIRED_DOC_TYPES = ['GOVERNMENT_ID', 'SELFIE', 'PROOF_OF_ADDRESS'] as const;

const deriveHandymanKycStatus = (
  docs: Array<{ document_type: string; status: string; submitted_at: string }>
) => {
  const latestByType = new Map<string, { status: string; submittedAtMs: number }>();
  for (const row of docs) {
    const submittedAtMs = new Date(row.submitted_at).getTime();
    const current = latestByType.get(row.document_type);
    if (!current || submittedAtMs > current.submittedAtMs) {
      latestByType.set(row.document_type, { status: row.status, submittedAtMs });
    }
  }

  const latestStatuses = REQUIRED_DOC_TYPES.map((type) => latestByType.get(type)?.status);
  if (latestStatuses.some((status) => status === 'REJECTED')) return 'REJECTED';
  if (latestStatuses.every((status) => status === 'APPROVED')) return 'APPROVED';
  return 'PENDING';
};

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
      headers: { Authorization: 'Bearer ' + SERVICE_ROLE_KEY, apikey: ANON_KEY },
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
      headers: { Authorization: 'Bearer ' + SERVICE_ROLE_KEY, apikey: ANON_KEY },
    }
  );
  const pd = await dr.json();
  const ids: string[] = Array.isArray(pd) ? pd.map((d: { id: string }) => d.id) : [];
  if (ids.length === 0)
    return err(422, {
      error: 'INVALID_STATE',
      message: 'No PENDING documents found for this handyman',
    });

  const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  const now = new Date().toISOString();
  const rr = action === 'REJECT' ? (reason ?? null) : null;

  const docsPatch = await fetch(
    `${SUPABASE_URL}/rest/v1/kyc_documents?handyman_id=eq.${encodeURIComponent(hmId)}&status=eq.PENDING`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        status: newStatus,
        reviewed_by: uid,
        reviewed_at: now,
        rejection_reason: rr,
      }),
    }
  );
  if (!docsPatch.ok)
    return err(500, { error: 'DATABASE_ERROR', message: 'Failed to update KYC documents' });

  const updatedDocs = await docsPatch.json();
  const updatedIds: string[] = Array.isArray(updatedDocs)
    ? updatedDocs.map((d: { id: string }) => d.id)
    : [];
  const pendingSet = new Set(ids);
  const updatedSet = new Set(updatedIds);
  const hasMismatch =
    pendingSet.size !== updatedSet.size || [...pendingSet].some((id) => !updatedSet.has(id));
  if (hasMismatch) {
    let rollbackWarning = '';
    if (updatedIds.length > 0) {
      const idFilter = updatedIds.map((id) => encodeURIComponent(id)).join(',');
      const rollback = await fetch(`${SUPABASE_URL}/rest/v1/kyc_documents?id=in.(${idFilter})`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
          apikey: ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          status: 'PENDING',
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
        }),
      });
      if (!rollback.ok) rollbackWarning = ' Rollback also failed; manual reconciliation required.';
    }
    return err(409, {
      error: 'CONFLICT',
      message: `KYC documents changed during review, please retry.${rollbackWarning}`,
    });
  }

  const statusSource = await fetch(
    `${SUPABASE_URL}/rest/v1/kyc_documents?handyman_id=eq.${encodeURIComponent(hmId)}&select=document_type,status,submitted_at`,
    {
      headers: { Authorization: 'Bearer ' + SERVICE_ROLE_KEY, apikey: ANON_KEY },
    }
  );
  if (!statusSource.ok)
    return err(500, { error: 'DATABASE_ERROR', message: 'Failed to read handyman KYC documents' });
  const allDocs = await statusSource.json();
  const handymanStatus = deriveHandymanKycStatus(Array.isArray(allDocs) ? allDocs : []);

  const handymanPatch = await fetch(
    `${SUPABASE_URL}/rest/v1/handymen?id=eq.${encodeURIComponent(hmId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ kyc_status: handymanStatus }),
    }
  );

  if (!handymanPatch.ok) {
    let rollbackSuffix = '';
    if (updatedIds.length > 0) {
      const idFilter = updatedIds.map((id) => encodeURIComponent(id)).join(',');
      const rollback = await fetch(`${SUPABASE_URL}/rest/v1/kyc_documents?id=in.(${idFilter})`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
          apikey: ANON_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          status: 'PENDING',
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
        }),
      });
      if (!rollback.ok) rollbackSuffix = ' Rollback also failed; manual reconciliation required.';
    }
    return err(500, {
      error: 'DATABASE_ERROR',
      message: `Failed to update handyman status; document rollback was attempted.${rollbackSuffix}`,
    });
  }

  return ok({
    success: true,
    handyman_id: hmId,
    documents_reviewed: updatedIds.length,
    action,
    message: `${updatedIds.length} document(s) ${newStatus.toLowerCase()}`,
  });
});
