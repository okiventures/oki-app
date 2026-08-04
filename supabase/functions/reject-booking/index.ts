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

interface RejectBookingRequest {
  bookingId: string;
  reason?: string;
}

// Exactly the columns mapBookingRow() consumes on the client. `select('*')`
// also returned `location` — the client's address as PostGIS coordinates —
// which is strictly more than the text address the request inbox shows, and
// there is no reason to hand it to a handyman who just declined the job.
// Written as one literal because supabase-js infers the row type from the
// select string; concatenating widens it to `string` and the inference is lost.
const BOOKING_SELECT =
  'id, client_id, handyman_id, service_id, booking_type, status, description, address_text, amount, platform_fee, net_amount, scheduled_at, request_expires_at, before_photo_url, after_photo_url, notes, created_at, updated_at, services!service_id(category)';

serve(async (req: Request) => {
  if (req.method !== 'POST') return methodNotAllowed();

  const auth = await requireHandyman(req);
  if ('error' in auth) return auth.error;
  const { user, supabase } = auth;

  // Same as accept: an unassigned PENDING booking is invisible to this caller
  // under RLS, and booking_events grants the authenticated role no INSERT.
  const db = serviceClient();

  const { bookingId, reason }: RejectBookingRequest = await req.json();
  if (!bookingId) return badRequest('bookingId required');

  const { data: booking, error: fetchError } = await db
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) return notFound('Booking not found');

  // SECURITY: same gating as accept-booking. Without this any registered
  // handyman (even non-KYC'd / offline) could reject arbitrary PENDING bookings
  // by iterating ids — a platform-wide cancellation DoS.
  const { data: handyman, error: handymanError } = await supabase
    .from('handymen')
    .select('is_online, kyc_status')
    .eq('id', user.id)
    .single();

  if (handymanError || !handyman) {
    return new Response(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Only handymen can reject bookings' }),
      { status: 403 }
    );
  }

  // Same category guard as accept-booking. REJECT writes a booking_event that
  // permanently hides the booking from this handyman's inbox, so without it a
  // handyman could iterate ids and suppress every pending job on the platform,
  // including categories they do not serve. It also stops the response below
  // from being a lookup oracle for arbitrary bookings.
  //
  // service_id is a to-one FK, so PostgREST returns `services` as an object.
  // Without generated Database types supabase-js cannot see the cardinality and
  // types the embed as an array, so accept both shapes rather than cast away a
  // mismatch that would read as `undefined` and 500 every reject.
  const servicesEmbed = booking.services as unknown as
    | { category: string }
    | { category: string }[]
    | null;
  const bookingCategory = Array.isArray(servicesEmbed)
    ? servicesEmbed[0]?.category
    : servicesEmbed?.category;
  if (!bookingCategory) return internalError('Booking has no service category');

  const { data: matchingServices, error: categoryError } = await db
    .from('handyman_services')
    // !inner makes the category a join filter — a plain embed returns the row
    // with a null `services`, so every category would look like a match.
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
    guards.push('Booking already assigned to another handyman');

  if (guards.length > 0) {
    return new Response(
      JSON.stringify({
        error: 'INVALID_STATE_TRANSITION',
        message: guards.join('; '),
        from_status: booking.status,
        to_status: 'REJECTED',
        action: 'REJECT',
        reason_code: 'GUARD_NOT_SATISFIED',
        details: { failed_guards: guards },
      }),
      { status: 422 }
    );
  }

  const { error: eventError } = await db.from('booking_events').insert({
    booking_id: bookingId,
    actor_id: user.id,
    from_status: 'PENDING',
    to_status: 'PENDING',
    metadata: { action: 'REJECT', ...(reason ? { reason } : {}) },
  });

  if (eventError) {
    console.error(
      `CRITICAL: Failed to write audit event for booking ${bookingId}:`,
      eventError.message
    );
  }

  // REJECT deliberately leaves the row PENDING and unassigned so it can be
  // re-broadcast — only the booking_event above changed. Re-reading it would
  // return the same columns we already hold, so return those rather than spend
  // a second round trip on an identical row.
  return ok(booking);
});
