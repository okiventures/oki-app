-- ============================================================================
-- 017 — booking detail read path
--
-- app/booking/[id].tsx could not be driven from live data: the reference,
-- address, coordinates, payment breakdown, handyman profile stats and the
-- event timeline all live in different tables, and `bookings.location` is a
-- geography column that PostgREST returns as WKB hex. Rather than have the
-- client issue five round trips and parse WKB, expose one flattened row.
--
-- get_booking_detail is SECURITY INVOKER on purpose: every table it touches
-- already has a participant-scoped SELECT policy, so RLS does the
-- authorization and a non-participant simply gets zero rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Let booking participants read their counterparty's handyman profile
--
-- handymen_select_searchable only exposed online + APPROVED handymen, so a
-- client lost their assigned handyman's rating and job count the moment that
-- handyman toggled offline — mid-job, in the detail screen. Mirrors the
-- counterparty clause that users_select_related already has.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS handymen_select_searchable ON public.handymen;
CREATE POLICY handymen_select_searchable ON public.handymen
  FOR SELECT
  USING (
    is_admin()
    OR id = auth.uid()
    OR (is_online = true AND kyc_status = 'APPROVED')
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.handyman_id = handymen.id
        AND b.client_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Flattened booking detail
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_booking_detail(p_booking_id uuid)
RETURNS TABLE (
  id                    uuid,
  client_id             uuid,
  client_name           text,
  client_photo_url      text,
  handyman_id           uuid,
  handyman_name         text,
  handyman_photo_url    text,
  handyman_rating       numeric,
  handyman_jobs         integer,
  service_category      text,
  service_name          text,
  booking_type          text,
  status                text,
  description           text,
  address_text          text,
  latitude              double precision,
  longitude            double precision,
  amount                numeric,
  platform_fee          numeric,
  net_amount            numeric,
  scheduled_at          timestamptz,
  request_expires_at    timestamptz,
  created_at            timestamptz,
  updated_at            timestamptz,
  photos                text[],
  before_photo_url      text,
  after_photo_url       text,
  notes                 text,
  payment_status        text,
  payment_method        text,
  payment_ref           text,
  paid_at               timestamptz,
  events                jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.client_id,
    cu.full_name,
    cu.photo_url,
    b.handyman_id,
    hu.full_name,
    hu.photo_url,
    h.trust_score,
    h.jobs_completed,
    s.category::text,
    s.name,
    b.booking_type::text,
    b.status::text,
    b.description,
    b.address_text,
    st_y(b.location::geometry),
    st_x(b.location::geometry),
    b.amount,
    b.platform_fee,
    b.net_amount,
    b.scheduled_at,
    b.request_expires_at,
    b.created_at,
    b.updated_at,
    b.photos,
    b.before_photo_url,
    b.after_photo_url,
    b.notes,
    p.status::text,
    p.payment_method,
    p.provider_payment_id,
    p.captured_at,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'id', be.id,
                   'from_status', be.from_status,
                   'to_status', be.to_status,
                   'actor_id', be.actor_id,
                   'metadata', be.metadata,
                   'created_at', be.created_at
                 )
                 ORDER BY be.created_at
               )
        FROM public.booking_events be
        WHERE be.booking_id = b.id
      ),
      '[]'::jsonb
    )
  FROM public.bookings b
  JOIN public.services s ON s.id = b.service_id
  JOIN public.users cu ON cu.id = b.client_id
  LEFT JOIN public.users hu ON hu.id = b.handyman_id
  LEFT JOIN public.handymen h ON h.id = b.handyman_id
  LEFT JOIN public.payments p ON p.booking_id = b.id
  WHERE b.id = p_booking_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_booking_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_detail(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_booking_detail(uuid) IS
  'Flattened booking detail for the booking detail screen. SECURITY INVOKER — '
  'RLS on bookings/users/handymen/payments/booking_events is the authorization.';
