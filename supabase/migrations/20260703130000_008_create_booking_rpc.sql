-- RPC to create a booking from client-side Edge Function
-- Handles booking creation + audit event + payment authorization in one transaction

create or replace function public.create_booking(
  p_client_id uuid,
  p_service_id uuid,
  p_booking_type booking_type,
  p_description text,
  p_address_text text,
  p_lat double precision,
  p_lng double precision,
  p_amount numeric,
  p_platform_fee numeric default 0,
  p_scheduled_at timestamptz default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_booking_id uuid;
  v_status booking_status := 'PENDING';
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_booking jsonb;
begin
  -- Validate caller is a client
  if not exists (select 1 from users where id = p_client_id and user_type = 'client') then
    raise exception 'Only clients can create bookings'
      using errcode = '40300';
  end if;

  -- Validate service exists
  if not exists (select 1 from services where id = p_service_id) then
    raise exception 'Service not found'
      using errcode = '40400';
  end if;

  -- Validate on-demand has no scheduled_at
  if p_booking_type = 'ON_DEMAND' and p_scheduled_at is not null then
    raise exception 'On-demand bookings must not have a scheduled time'
      using errcode = '42200';
  end if;

  -- Insert booking
  insert into public.bookings (
    client_id,
    service_id,
    booking_type,
    status,
    description,
    address_text,
    location,
    amount,
    platform_fee,
    scheduled_at,
    request_expires_at,
    notes
  ) values (
    p_client_id,
    p_service_id,
    p_booking_type,
    v_status,
    p_description,
    p_address_text,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
    p_amount,
    p_platform_fee,
    p_scheduled_at,
    case when p_booking_type = 'ON_DEMAND' then v_expires_at else null end,
    p_notes
  )
  returning id into v_booking_id;

  -- Audit event
  insert into public.booking_events (booking_id, actor_id, from_status, to_status, metadata)
  values (v_booking_id, p_client_id, null, v_status, jsonb_build_object('action', 'CREATE'));

  -- Payment authorization (escrow hold)
  insert into public.payments (booking_id, client_id, status, amount_authorized, currency)
  values (v_booking_id, p_client_id, 'AUTHORIZED', p_amount, 'PHP');

  -- Return the created booking as JSON
  select row_to_json(b)::jsonb into v_booking
  from public.bookings b where b.id = v_booking_id;

  return v_booking;
end;
$$;
