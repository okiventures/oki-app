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

revoke execute on function public.get_handyman_blocked_slots(uuid, timestamptz, timestamptz) from anon;