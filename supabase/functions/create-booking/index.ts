import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

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

  const supabase = createClient(ampUrl, ampKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: authHeader },
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

  // description can be empty (form allows it); addressText and serviceId must be present
  if (!body.serviceId || body.description == null || !body.addressText) {
    return new Response(
      JSON.stringify({
        error: 'BAD_REQUEST',
        message: 'Missing required fields: serviceId, description, addressText',
      }),
      { status: 400 }
    );
  }

  // Call RPC with service_role key — no client_id/amount passed;
  // RPC derives both from auth.uid() and services.base_rate respectively.
  const { data: booking, error: rpcError } = await supabase.rpc('create_booking', {
    p_service_id: body.serviceId,
    p_booking_type: body.bookingType,
    p_description: body.description,
    p_address_text: body.addressText,
    p_lat: body.lat,
    p_lng: body.lng,
    p_scheduled_at: body.scheduledAt ?? null,
    p_notes: body.notes ?? null,
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
