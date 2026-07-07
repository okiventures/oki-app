const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');

// Fail closed: default to no cross-origin access. Set ALLOWED_ORIGIN to the
// admin/web origin in each environment. Native apps don't enforce CORS.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '';
if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) throw new Error('Missing required env vars');

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};
const cors = (h?: Record<string, string>) => ({ ...CORS, ...h });
const err = (s: number, b: Record<string, unknown>) =>
  new Response(JSON.stringify(b), { status: s, headers: cors() });
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: cors({ 'Content-Type': 'application/json' }),
  });
const absUrl = (u: string | null) => (u?.startsWith('/') ? `${SUPABASE_URL}/storage/v1${u}` : u);
const encPath = (p: string) =>
  p
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');

const LABELS: Record<string, string> = {
  GOVERNMENT_ID: 'Government ID',
  SELFIE: 'Selfie',
  PROOF_OF_ADDRESS: 'Proof of Address',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'GET') return err(405, { error: 'METHOD_NOT_ALLOWED' });

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
  const profiles = await pr.json();
  if (!Array.isArray(profiles) || profiles.length === 0 || profiles[0].user_type !== 'admin')
    return err(403, { error: 'FORBIDDEN', message: 'Admin access required' });

  const u = new URL(req.url);
  const status = u.searchParams.get('status') ?? 'PENDING';
  const page = Math.max(parseInt(u.searchParams.get('page') ?? '1'), 1);
  const limit = Math.min(Math.max(parseInt(u.searchParams.get('limit') ?? '20'), 1), 100);
  const offset = (page - 1) * limit;

  const cr = await fetch(
    `${SUPABASE_URL}/rest/v1/kyc_documents?status=eq.${encodeURIComponent(status)}&select=count`,
    {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: ANON_KEY,
        Prefer: 'count=exact',
      },
    }
  );
  const total = parseInt(cr.headers.get('content-range')?.split('/')[1] ?? '0');

  const dr = await fetch(
    `${SUPABASE_URL}/rest/v1/kyc_documents?status=eq.${encodeURIComponent(status)}&select=id,handyman_id,document_type,file_path,status,submitted_at&order=submitted_at.asc&limit=${limit}&offset=${offset}`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const docs = await dr.json();
  if (!Array.isArray(docs) || docs.length === 0)
    return json(200, {
      data: [],
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  const hmIds = [...new Set(docs.map((d: any) => d.handyman_id))];
  const ur2 = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=in.(${hmIds.map((id: string) => encodeURIComponent(id)).join(',')})&select=id,full_name,email`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const users = ur2.ok ? await ur2.json() : [];
  const um = new Map<string, { full_name: string; email: string }>();
  if (Array.isArray(users))
    for (const u of users)
      um.set(u.id, { full_name: u.full_name ?? 'Unknown', email: u.email ?? '' });

  const signed = await Promise.all(
    docs.map(async (doc: any) => {
      let url: string | null = null;
      try {
        const sr = await fetch(
          `${SUPABASE_URL}/storage/v1/object/sign/kyc-documents/${encPath(doc.file_path)}`,
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
          url = absUrl(sd.signedURL ?? sd.signedUrl ?? null);
        }
      } catch {}
      return {
        id: doc.id,
        type: doc.document_type,
        label: LABELS[doc.document_type] ?? doc.document_type,
        url,
        handyman_id: doc.handyman_id,
        submitted_at: doc.submitted_at,
        status: doc.status,
      };
    })
  );

  const grouped = new Map();
  for (const d of signed) {
    const u = um.get(d.handyman_id);
    if (grouped.has(d.handyman_id)) {
      const g = grouped.get(d.handyman_id);
      g.documents.push({ id: d.id, type: d.type, label: d.label, url: d.url, status: d.status });
      if (d.submitted_at < g.submitted_at) g.submitted_at = d.submitted_at;
    } else {
      grouped.set(d.handyman_id, {
        handyman_id: d.handyman_id,
        handyman_name: u?.full_name ?? 'Unknown',
        handyman_email: u?.email ?? '',
        submitted_at: d.submitted_at,
        documents: [{ id: d.id, type: d.type, label: d.label, url: d.url, status: d.status }],
      });
    }
  }

  return json(200, {
    data: [...grouped.values()],
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
