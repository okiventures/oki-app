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
const json = (s: number, b: Record<string, unknown>) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: cors({ 'Content-Type': 'application/json' }),
  });

const encPath = (p: string) =>
  p
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
const absUrl = (u: string | null) => {
  if (!u) return null;
  if (u.startsWith('/')) return `${SUPABASE_URL}/storage/v1${u}`;
  return u;
};

const MIME = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;
const KYC_TYPES = ['GOVERNMENT_ID', 'SELFIE', 'PROOF_OF_ADDRESS'] as const;

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return err(405, { error: 'METHOD_NOT_ALLOWED' });

  const contentLength = parseInt(req.headers.get('Content-Length') ?? '0', 10);
  if (contentLength > MAX_SIZE * 2)
    return err(413, {
      error: 'BODY_TOO_LARGE',
      message: `Request body exceeds ${Math.round((MAX_SIZE * 2) / 1024 / 1024)} MB limit`,
    });

  const ah = req.headers.get('Authorization');
  if (!ah) return err(401, { error: 'UNAUTHORIZED', message: 'Authentication required' });

  const uResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: ah, apikey: ANON_KEY },
  });
  if (!uResp.ok) return err(401, { error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  const userId = (await uResp.json()).id;

  const hmCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/handymen?id=eq.${encodeURIComponent(userId)}&select=id`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const hmData = await hmCheck.json();
  if (!Array.isArray(hmData) || hmData.length === 0)
    return err(403, { error: 'FORBIDDEN', message: 'Only handymen can upload KYC documents' });

  const ct = req.headers.get('Content-Type') ?? '';
  let docType: string, fname: string, mime: string, bytes: Uint8Array;

  if (ct.includes('multipart/form-data')) {
    let fd: FormData;
    try {
      fd = await req.formData();
    } catch {
      return err(400, { error: 'BAD_REQUEST', message: 'Invalid multipart form data' });
    }
    docType = (fd.get('document_type') as string) ?? '';
    const file = fd.get('file') as File | null;
    if (!file || !(file instanceof File))
      return err(400, {
        error: 'VALIDATION_ERROR',
        message: 'File is required',
        details: { field: 'file', issue: 'Missing file' },
      });
    fname = file.name;
    mime = file.type;
    bytes = new Uint8Array(await file.arrayBuffer());
  } else {
    let bd: Record<string, unknown>;
    try {
      bd = await req.json();
    } catch {
      return err(400, { error: 'BAD_REQUEST', message: 'Invalid JSON body' });
    }
    docType = (bd.document_type as string) ?? '';
    fname = (bd.file_name as string) ?? 'upload.bin';
    mime = (bd.file_mime_type as string) ?? 'application/octet-stream';

    if (!bd.file_content || typeof bd.file_content !== 'string')
      return err(400, {
        error: 'VALIDATION_ERROR',
        message: 'file_content (base64) is required',
        details: { field: 'file_content', issue: 'Missing or invalid' },
      });
    try {
      bytes = new Uint8Array(
        atob(bd.file_content)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
    } catch {
      return err(400, {
        error: 'VALIDATION_ERROR',
        message: 'file_content is not valid base64',
        details: { field: 'file_content', issue: 'Invalid base64' },
      });
    }
  }

  if (!docType || !(KYC_TYPES as readonly string[]).includes(docType))
    return err(400, {
      error: 'VALIDATION_ERROR',
      message: 'document_type must be one of: GOVERNMENT_ID, SELFIE, PROOF_OF_ADDRESS',
      details: { field: 'document_type', issue: 'Invalid or missing' },
    });
  if (!MIME.includes(mime))
    return err(400, {
      error: 'INVALID_FILE_TYPE',
      message: 'Only JPEG, PNG, and PDF files are accepted',
    });
  if (bytes.length > MAX_SIZE)
    return err(400, { error: 'FILE_TOO_LARGE', message: 'File exceeds the 5 MB limit' });
  if (bytes.length === 0) return err(400, { error: 'VALIDATION_ERROR', message: 'File is empty' });

  const ext =
    mime === 'image/jpeg'
      ? 'jpg'
      : mime === 'image/png'
        ? 'png'
        : mime === 'application/pdf'
          ? 'pdf'
          : 'bin';
  const path = `${userId}/${docType.toLowerCase()}/${crypto.randomUUID()}.${ext}`;

  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/kyc-documents/${encPath(path)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': mime,
      'x-upsert': 'false',
    },
    body: bytes,
  });
  if (!up.ok) return err(500, { error: 'UPLOAD_FAILED', message: 'File upload failed' });

  const ex = await fetch(
    `${SUPABASE_URL}/rest/v1/kyc_documents?handyman_id=eq.${encodeURIComponent(userId)}&document_type=eq.${encodeURIComponent(docType)}&status=eq.PENDING&select=id,file_path`,
    { headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY } }
  );
  if (ex.ok) {
    const exDocs = await ex.json();
    if (Array.isArray(exDocs) && exDocs.length > 0) {
      for (const d of exDocs) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/kyc-documents/${encPath(d.file_path)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        });
        await fetch(`${SUPABASE_URL}/rest/v1/kyc_documents?id=eq.${encodeURIComponent(d.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
        });
      }
    }
  }

  const ins = await fetch(`${SUPABASE_URL}/rest/v1/kyc_documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      handyman_id: userId,
      document_type: docType,
      file_path: path,
      file_name: fname,
      file_size: bytes.length,
      mime_type: mime,
    }),
  });
  if (!ins.ok) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/kyc-documents/${encPath(path)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    return err(500, { error: 'DATABASE_ERROR', message: 'Failed to create document record' });
  }
  const res = await ins.json();
  const doc = Array.isArray(res) ? res[0] : res;
  if (!doc)
    return err(500, { error: 'DATABASE_ERROR', message: 'Failed to create document record' });

  let signedUrl: string | null = null;
  try {
    const sr = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/kyc-documents/${encPath(path)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 60 }),
      }
    );
    if (sr.ok) {
      const sd = await sr.json();
      signedUrl = absUrl(sd.signedURL ?? sd.signedUrl ?? null);
    }
  } catch {
    /* ignore */
  }

  const pr = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=full_name,email`,
    {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, apikey: ANON_KEY },
    }
  );
  const profiles = pr.ok ? await pr.json() : [];
  const profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : {};

  const uf =
    docType === 'GOVERNMENT_ID'
      ? 'front_id_url'
      : docType === 'SELFIE'
        ? 'selfie_url'
        : 'proof_of_address_url';

  return json(201, {
    id: doc.id,
    handyman_id: doc.handyman_id,
    handyman_name: profile.full_name ?? 'Unknown',
    handyman_email: profile.email ?? '',
    document_type: doc.document_type,
    [uf]: signedUrl,
    status: doc.status,
    submitted_at: doc.submitted_at,
    reviewed_at: doc.reviewed_at,
  });
});
