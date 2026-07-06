-- Search nearest handymen by service category
-- Returns online, KYC-approved handymen within a radius, sorted by distance
create or replace function public.search_nearest_handymen(
  p_client_lat double precision,
  p_client_lng double precision,
  p_radius_meters float,
  p_category service_category
)
returns table (
  handyman_id uuid,
  user_name text,
  photo_url text,
  is_online boolean,
  distance_meters float8
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    h.id,
    u.full_name,
    u.photo_url,
    h.is_online,
    st_distance(
      h.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography
    ) as distance_meters
  from handymen h
  join users u on h.id = u.id
  join handyman_services hs on h.id = hs.handyman_id
  join services s on hs.service_id = s.id
  where h.is_online = true
    and h.kyc_status = 'APPROVED'
    and h.location is not null
    and s.category = p_category
    and st_dwithin(
      h.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography,
      p_radius_meters
    )
  order by distance_meters asc
  limit 20;
end;
$$;
