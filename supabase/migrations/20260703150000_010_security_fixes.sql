-- ─── Fix 006: upsert_handyman_location — drop p_handyman_id, derive from auth.uid() ───

create or replace function public.upsert_handyman_location(
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.handyman_locations (id, location, updated_at)
  values (
    auth.uid(),
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    now()
  )
  on conflict (id) do update
  set
    location = excluded.location,
    updated_at = excluded.updated_at;
end;
$$;

revoke execute on function public.upsert_handyman_location(double precision, double precision) from anon;

-- ─── Fix 007: get_handyman_blocked_slots — REVOKE anon ─────────────────────────

revoke execute on function public.get_handyman_blocked_slots(uuid, timestamptz, timestamptz) from anon;

-- ─── Fix 008: create_booking — drop p_client_id/p_amount, derive server-side ───

create or replace function public.create_booking(
  p_service_id uuid,
  p_booking_type booking_type,
  p_description text,
  p_address_text text,
  p_lat double precision,
  p_lng double precision,
  p_scheduled_at timestamptz default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_client_id uuid;
  v_booking_id uuid;
  v_status booking_status := 'PENDING';
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_amount numeric;
  v_platform_fee numeric;
  v_booking jsonb;
begin
  v_client_id := auth.uid();
  if v_client_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from users where id = v_client_id and user_type = 'client') then
    raise exception 'Only clients can create bookings' using errcode = '40300';
  end if;

  select base_rate into strict v_amount from services where id = p_service_id;
  v_platform_fee := round(v_amount * 0.10, 2);

  if p_booking_type = 'ON_DEMAND' and p_scheduled_at is not null then
    raise exception 'On-demand bookings must not have a scheduled time' using errcode = '42200';
  end if;

  insert into public.bookings (
    client_id, service_id, booking_type, status, description,
    address_text, location, amount, platform_fee, scheduled_at,
    request_expires_at, notes
  ) values (
    v_client_id, p_service_id, p_booking_type, v_status, p_description,
    p_address_text,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    v_amount, v_platform_fee, p_scheduled_at,
    case when p_booking_type = 'ON_DEMAND' then v_expires_at else null end,
    p_notes
  )
  returning id into v_booking_id;

  insert into public.booking_events (booking_id, actor_id, from_status, to_status, metadata)
  values (v_booking_id, v_client_id, null, v_status, jsonb_build_object('action', 'CREATE'));

  insert into public.payments (booking_id, client_id, status, amount_authorized, currency)
  values (v_booking_id, v_client_id, 'AUTHORIZED', v_amount, 'PHP');

  select row_to_json(b)::jsonb into v_booking from public.bookings b where b.id = v_booking_id;
  return v_booking;
end;
$$;

revoke execute on function public.create_booking(uuid, booking_type, text, text, double precision, double precision, timestamptz, text) from anon, authenticated;
