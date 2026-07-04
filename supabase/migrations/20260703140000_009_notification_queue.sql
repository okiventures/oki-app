-- Add expo_push_token to handymen for push notification delivery
alter table public.handymen
add column if not exists expo_push_token text;

-- Notification queue for scheduled booking reminders
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  handyman_id uuid references public.handymen(id) on delete cascade not null,
  send_at timestamptz not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
  error_log text,
  created_at timestamptz not null default now()
);

-- Index for the cron worker to find pending notifications efficiently
create index if not exists idx_notification_queue_send_at
  on public.notification_queue(send_at)
  where status = 'PENDING';

-- Queue notification when a handyman accepts a SCHEDULED booking
create or replace function public.enqueue_scheduled_booking_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_lead_time interval := interval '1 hour';
begin
  -- Only fire when handyman_id is newly assigned (ACCEPT transition)
  -- and the booking has a scheduled time
  if new.handyman_id is not null
     and (old.handyman_id is distinct from new.handyman_id)
     and new.scheduled_at is not null
  then
    insert into public.notification_queue (booking_id, handyman_id, send_at)
    values (new.id, new.handyman_id, new.scheduled_at - v_lead_time);
  end if;

  return new;
end;
$$;

create or replace trigger trigger_enqueue_booking_notification
  after update on public.bookings
  for each row
  execute function public.enqueue_scheduled_booking_notification();

-- Remove queued notifications when a booking is cancelled
create or replace function public.cleanup_notification_on_cancel()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.notification_queue
  where booking_id = old.id
    and status = 'PENDING';
  return new;
end;
$$;

create or replace trigger trigger_cleanup_notification_on_cancel
  after update of status on public.bookings
  for each row
  when (new.status = 'CANCELLED')
  execute function public.cleanup_notification_on_cancel();
