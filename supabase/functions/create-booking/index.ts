import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), { status: 401 });
  }

  const body: CreateBookingRequest = await req.json();

  if (!body.serviceId || !body.description || !body.addressText) {
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
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: rpcError.message,
        details: rpcError.details,
      }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ data: booking }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
});
