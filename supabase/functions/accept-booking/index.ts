import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  requireHandyman,
  serviceClient,
  methodNotAllowed,
  badRequest,
  notFound,
  internalError,
  ok,
} from '../_shared/rbac.ts';

interface AcceptBookingRequest {
  bookingId: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  const auth = await requireHandyman(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  // A PENDING booking has no handyman yet, so it matches no RLS policy for this
  // caller — the read and the assignment both have to run with owner privilege.
  // Every guard below is enforced here in the function.
  const db = serviceClient();

  const { bookingId }: AcceptBookingRequest = await req.json();
  if (!bookingId) return badRequest('bookingId required');

  const { data: booking, error: fetchError } = await db
    .from('bookings')
    .select('*, services!service_id(category)')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) return notFound('Booking not found');

  const { data: handyman, error: handymanError } = await supabase
    .from('handymen')
    .select('*')
    .eq('id', user.id)
    .single();

  if (handymanError || !handyman) {
    return new Response(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Only handymen can accept bookings' }),
      { status: 403 }
    );
  }

  // list_available_bookings() only *shows* a handyman the categories they serve,
  // so the category match has never been enforced anywhere: a direct call here
  // with an arbitrary bookingId could take a job outside them.
  const bookingCategory = (booking.services as { category: string } | null)?.category;
  if (!bookingCategory) return internalError('Booking has no service category');

  const { data: matchingServices, error: categoryError } = await db
    .from('handyman_services')
    // !inner makes the category a join filter. A plain embed would still return
    // the row with a null `services`, so every category would look like a match.
    .select('service_id, services!inner(category)')
    .eq('handyman_id', user.id)
    .eq('services.category', bookingCategory);

  if (categoryError) return internalError(categoryError.message);

  const guards: string[] = [];
  if (booking.status !== 'PENDING') guards.push('Booking must be PENDING');
  if (!matchingServices || matchingServices.length === 0)
    guards.push(`Handyman does not offer ${bookingCategory} services`);
  if (!handyman.is_online) guards.push('Handyman must be online');
  if (handyman.kyc_status !== 'APPROVED') guards.push('KYC must be approved');
  if (booking.handyman_id && booking.handyman_id !== user.id)
    guards.push('Booking already assigned');

  if (guards.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: guards.join('; '),
        from_status: booking.status,
        to_status: 'ACCEPTED',
        action: 'ACCEPT',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: guards },
      }),
      { status: 422 }
    );
  }

  const { data: updatedBooking, error: updateError } = await db
    .from('bookings')
    .update({ status: 'ACCEPTED', handyman_id: user.id, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'PENDING')
    .select()
    .maybeSingle();

  if (updateError) {
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: updateError.message }), {
      status: 500,
    });
  }

  if (!updatedBooking) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: 'Booking was accepted by another handyman',
        from_status: 'PENDING',
        to_status: 'ACCEPTED',
        action: 'ACCEPT',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: ['Booking no longer PENDING or already assigned'] },
      }),
      { status: 409 }
    );
  }

  const { error: eventError } = await db.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: user.id,
    from_status: 'PENDING',
    to_status: 'ACCEPTED',
    metadata: { action: 'ACCEPT' },
  });

  if (eventError) {
    console.error(
      `CRITICAL: Failed to write audit event for booking ${bookingId}:`,
      eventError.message
    );
  }

  return ok(updatedBooking);
});
