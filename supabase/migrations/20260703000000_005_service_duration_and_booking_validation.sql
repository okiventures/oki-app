-- Add estimated_duration to services for double-booking overlap check
alter table public.services
add column if not exists estimated_duration interval;

-- Temporary estimated durations per service
update public.services set estimated_duration = interval '1 hour'   where slug = 'plumbing-general';
update public.services set estimated_duration = interval '2 hours'  where slug = 'plumbing-water-heater';
update public.services set estimated_duration = interval '2 hours 30 minutes' where slug = 'electrical-wiring';
update public.services set estimated_duration = interval '1 hour 30 minutes' where slug = 'electrical-lighting';
update public.services set estimated_duration = interval '1 hour'   where slug = 'carpentry-furniture';
update public.services set estimated_duration = interval '3 hours'  where slug = 'carpentry-custom';
update public.services set estimated_duration = interval '2 hours'  where slug = 'cleaning-general';
update public.services set estimated_duration = interval '4 hours'  where slug = 'painting-interior';
update public.services set estimated_duration = interval '1 hour 30 minutes' where slug = 'hvac-general';
update public.services set estimated_duration = interval '1 hour'   where slug = 'general-handyman';

-- Not-null enforcement after populating
alter table public.services
alter column estimated_duration set not null;

-- ─── INSERT trigger: validate scheduled_at is at least 2 hours in the future ───

create or replace function public.validate_scheduled_booking_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.scheduled_at < now() + interval '2 hours' then
    raise exception 'Bookings must be scheduled at least 2 hours in advance'
      using errcode = '42201';
  end if;
  return new;
end;
$$;

create trigger enforce_schedule_future
  before insert on public.bookings
  for each row
  when (new.scheduled_at is not null)
  execute function public.validate_scheduled_booking_insert();

-- ─── UPDATE trigger: prevent double-booking when handyman accepts ─────────────

create or replace function public.validate_booking_accept()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_overlapping int;
  v_duration interval;
begin
  -- Only fire when handyman_id is being set (ACCEPT transition)
  if new.handyman_id is not null and (old.handyman_id is distinct from new.handyman_id) then
    -- Look up the estimated duration for this booking's service
    select estimated_duration into strict v_duration
    from public.services
    where id = new.service_id;

    select count(*) into v_overlapping
    from public.bookings
    where handyman_id = new.handyman_id
      and id != new.id
      and status not in ('CANCELLED', 'COMPLETED', 'PAID')
      and scheduled_at is not null
      and tsrange(scheduled_at, scheduled_at + v_duration) &&
          tsrange(new.scheduled_at, new.scheduled_at + v_duration);

    if v_overlapping > 0 then
      raise exception 'Handyman is already booked during this time'
        using errcode = '42202';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_no_double_booking
  before update on public.bookings
  for each row
  when (new.handyman_id is not null and new.scheduled_at is not null)
  execute function public.validate_booking_accept();

-- ─── RPC: get blocked time slots for a handyman ─────────────────────────────

create or replace function public.get_handyman_blocked_slots(
  p_handyman_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns table (
  blocked_start timestamptz,
  blocked_end timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    b.scheduled_at as blocked_start,
    b.scheduled_at + s.estimated_duration as blocked_end
  from public.bookings b
  join public.services s on b.service_id = s.id
  where b.handyman_id = p_handyman_id
    and b.scheduled_at >= p_start_date
    and b.scheduled_at <= p_end_date
    and b.status not in ('CANCELLED', 'COMPLETED', 'PAID')
  order by b.scheduled_at asc;
end;
$$;
