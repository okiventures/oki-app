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

const CATS = [
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Cleaning',
  'Painting',
  'HVAC',
  'Roofing',
  'Landscaping',
  'Appliance Repair',
  'General Handyman',
] as const;

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

  const hm = await fetch(
    `${SUPABASE_URL}/rest/v1/handymen?id=eq.${encodeURIComponent(uid)}&select=id`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const hd = await hm.json();
  if (!Array.isArray(hd) || hd.length === 0)
    return err(403, { error: 'FORBIDDEN', message: 'Only handymen can submit onboarding' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err(400, { error: 'BAD_REQUEST', message: 'Invalid JSON body' });
  }
  const fn = (body.full_name as string) ?? '';
  const ph = (body.phone as string) ?? '';
  const bio = (body.bio as string) ?? '';
  const yrs = Number(body.years_experience) || 0;
  const svcs = (body.services as { category: string; rate: number }[]) ?? [];

  if (!fn || fn.trim().length < 3)
    return err(400, {
      error: 'VALIDATION_ERROR',
      message: 'full_name is required (minimum 3 characters)',
      details: { field: 'full_name' },
    });
  if (!ph || ph.replace(/\D/g, '').length < 10)
    return err(400, {
      error: 'VALIDATION_ERROR',
      message: 'phone is required (minimum 10 digits)',
      details: { field: 'phone' },
    });
  if (bio && bio.length > 500)
    return err(400, {
      error: 'VALIDATION_ERROR',
      message: 'bio must be 500 characters or fewer',
      details: { field: 'bio' },
    });
  if (!Array.isArray(svcs) || svcs.length === 0)
    return err(400, {
      error: 'VALIDATION_ERROR',
      message: 'at least one service is required',
      details: { field: 'services' },
    });
  for (const s of svcs) {
    if (!(CATS as readonly string[]).includes(s.category))
      return err(400, {
        error: 'VALIDATION_ERROR',
        message: `Invalid service category: ${s.category}`,
        details: { field: 'services', issue: 'invalid_category' },
      });
    if (typeof s.rate !== 'number' || s.rate <= 0)
      return err(400, {
        error: 'VALIDATION_ERROR',
        message: `Service ${s.category} must have a positive rate`,
        details: { field: 'services', issue: 'invalid_rate' },
      });
  }

  const db = (m: string, p: string, d?: unknown) =>
    fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
      method: m,
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      ...(d ? { body: JSON.stringify(d) } : {}),
    });

  const uu = await db('PATCH', `users?id=eq.${encodeURIComponent(uid)}`, {
    full_name: fn.trim(),
    phone: ph,
  });
  if (!uu.ok) return err(500, { error: 'DATABASE_ERROR', message: 'Failed to update profile' });

  const hu = await db('PATCH', `handymen?id=eq.${encodeURIComponent(uid)}`, {
    bio: bio.trim() || null,
    years_experience: yrs,
  });
  if (!hu.ok)
    return err(500, { error: 'DATABASE_ERROR', message: 'Failed to update handyman profile' });

  const orClause = svcs.map((s) => `category.eq.${encodeURIComponent(s.category)}`).join(',');
  const sr = await fetch(`${SUPABASE_URL}/rest/v1/services?select=id,category&or=(${orClause})`, {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
  });
  if (!sr.ok)
    return err(500, { error: 'DATABASE_ERROR', message: 'Failed to fetch services catalog' });
  const rows = await sr.json();
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.category, r.id);

  let n = 0;
  for (const s of svcs) {
    const sid = map.get(s.category);
    if (!sid) continue;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/handyman_services`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ handyman_id: uid, service_id: sid, price_override: s.rate }),
    });
    if (r.ok) n++;
  }

  return ok({
    success: true,
    user_id: uid,
    services_linked: n,
    message: 'Onboarding submitted successfully',
  });
});
