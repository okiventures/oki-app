-- Notify nearby matching handymen when a new booking is created (broadcast).
-- Called by the create-booking Edge Function after successful booking creation.
-- Finds handymen matching the service category within 50 km radius, inserts
-- notification_queue entries (send_at = now()) so the notification-worker picks
-- them up for Expo push delivery within ~1 minute.
--
-- Only callable via service_role (Edge Function). Revoked from public so
-- authenticated/anon cannot enumerate nearby handymen.

create or replace function public.notify_nearby_handymen(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_service_id uuid;
  v_category    service_category;
  v_lat         double precision;
  v_lng         double precision;
  v_ids         uuid[];
  v_notified    jsonb;
begin
  select b.service_id,
         st_y(b.location::geometry) as lat,
         st_x(b.location::geometry) as lng
  into v_service_id, v_lat, v_lng
  from bookings b
  where b.id = p_booking_id;

  if not found then
    return '[]'::jsonb;
  end if;

  select s.category into v_category
  from services s
  where s.id = v_service_id;

  if v_category is null then
    return '[]'::jsonb;
  end if;

  -- Run spatial search once, collect IDs and JSON result in one pass
  with nearby as (
    select handyman_id, distance_meters
    from public.search_nearest_handymen(v_lat, v_lng, 50000, v_category)
  )
  select
    array_agg(handyman_id),
    jsonb_agg(
      jsonb_build_object(
        'handyman_id',     handyman_id,
        'distance_meters', distance_meters
      )
    )
  into v_ids, v_notified
  from nearby;

  if v_ids is null then
    return '[]'::jsonb;
  end if;

  insert into public.notification_queue (booking_id, handyman_id, send_at)
  select p_booking_id, unnest(v_ids), now();

  return coalesce(v_notified, '[]'::jsonb);
end;
$$;

revoke execute on function public.notify_nearby_handymen(uuid) from public;
