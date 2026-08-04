import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
// Pinned URL rather than the bare specifier: every other function imports it
// this way, and it resolves under `supabase functions serve` without depending
// on the per-function import_map being picked up.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

interface CreateBookingRequest {
  serviceId: string;
  bookingType: 'ON_DEMAND' | 'SCHEDULED';
  description: string;
  addressText: string;
  lat: number;
  lng: number;
  scheduledAt?: string;
  notes?: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('create-booking: missing Authorization header');
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
  }

  const ampKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ampUrl = Deno.env.get('SUPABASE_URL')!;

  const token = authHeader.replace(/^Bearer\s+/i, '');

  // Deliberately NOT forwarding the caller's Authorization header. PostgREST
  // derives the database role from whatever JWT it receives, so passing the user
  // token here would downgrade this client to `authenticated` — which has no
  // EXECUTE on create_booking or notify_nearby_handymen (both service-role only).
  // The caller is authenticated below via getUser(token) instead, and their id is
  // passed to the RPC explicitly.
  const supabase = createClient(ampUrl, ampKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error('create-booking: auth.getUser failed', authError?.message ?? 'No user returned');
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
  }

  const body: CreateBookingRequest = await req.json();

  const bad = (message: string) =>
    new Response(JSON.stringify({ error: 'BAD_REQUEST', message }), { status: 400 });

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!body.serviceId || !UUID_RE.test(body.serviceId))
    return bad('serviceId must be a valid UUID');
  if (body.bookingType !== 'ON_DEMAND' && body.bookingType !== 'SCHEDULED')
    return bad('bookingType must be ON_DEMAND or SCHEDULED');
  if (typeof body.description !== 'string' || body.description.trim().length === 0)
    return bad('description is required');
  if (body.description.length > 2000) return bad('description too long (max 2000)');
  if (typeof body.addressText !== 'string' || body.addressText.trim().length === 0)
    return bad('addressText is required');
  if (body.addressText.length > 500) return bad('addressText too long (max 500)');
  if (typeof body.lat !== 'number' || !Number.isFinite(body.lat) || body.lat < -90 || body.lat > 90)
    return bad('lat must be a number between -90 and 90');
  if (
    typeof body.lng !== 'number' ||
    !Number.isFinite(body.lng) ||
    body.lng < -180 ||
    body.lng > 180
  )
    return bad('lng must be a number between -180 and 180');
  if (body.notes != null && (typeof body.notes !== 'string' || body.notes.length > 2000))
    return bad('notes must be a string (max 2000)');

  if (body.bookingType === 'SCHEDULED') {
    const when = body.scheduledAt ? Date.parse(body.scheduledAt) : NaN;
    if (Number.isNaN(when)) return bad('scheduledAt must be a valid ISO timestamp for SCHEDULED');
    if (when <= Date.now()) return bad('scheduledAt must be in the future');
  } else if (body.scheduledAt) {
    return bad('ON_DEMAND bookings must not include scheduledAt');
  }

  // Called with the service_role key, so auth.uid() is NULL inside the RPC and
  // p_client_id supplies the identity — taken from the verified token above, not
  // from the request body. amount/platform_fee stay derived from
  // services.base_rate server-side and are never accepted from the client.
  const { data: booking, error: rpcError } = await supabase.rpc('create_booking', {
    p_service_id: body.serviceId,
    p_booking_type: body.bookingType,
    p_description: body.description,
    p_address_text: body.addressText,
    p_lat: body.lat,
    p_lng: body.lng,
    p_scheduled_at: body.scheduledAt ?? null,
    p_notes: body.notes ?? null,
    p_client_id: user.id,
  });

  if (rpcError) {
    console.error('create-booking: create_booking RPC failed', {
      message: rpcError.message,
      details: rpcError.details,
      hint: rpcError.hint,
    });
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: rpcError.message,
        details: rpcError.details,
      }),
      { status: 500 }
    );
  }

  console.log('create-booking: booking created', { bookingId: booking.id });

  // ─── Broadcast to nearby matching handymen ──────────────────────────────────
  let notifiedHandymen: Array<{ handyman_id: string; distance_meters: number }> = [];
  try {
    const { data: notifications, error: notifyError } = await supabase.rpc(
      'notify_nearby_handymen',
      { p_booking_id: booking.id }
    );

    if (notifyError) {
      console.error('create-booking: notify_nearby_handymen RPC failed', notifyError.message);
    } else {
      notifiedHandymen = (notifications ?? []) as any;
      console.log(
        `create-booking: notified ${notifiedHandymen.length} handymen for booking ${booking.id}`
      );
    }
  } catch (err) {
    console.error('create-booking: broadcast exception', err instanceof Error ? err.message : err);
  }

  return new Response(JSON.stringify({ data: booking, notifiedHandymen }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
});
