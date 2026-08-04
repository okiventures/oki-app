-- Allow category-less search: p_category is NULL when the client browses
-- "All Services". The predicate must skip the category filter in that case,
-- otherwise `s.category = NULL` matches nothing.

CREATE OR REPLACE FUNCTION public.search_nearest_handymen(
  p_client_lat double precision,
  p_client_lng double precision,
  p_radius_meters float,
  p_category service_category
)
RETURNS TABLE (
  handyman_id uuid,
  user_name text,
  photo_url text,
  is_online boolean,
  distance_meters float8
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    u.full_name,
    u.photo_url,
    h.is_online,
    st_distance(
      hl.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography
    ) AS distance_meters
  FROM handymen h
  JOIN users u ON h.id = u.id
  JOIN handyman_locations hl ON h.id = hl.id
  JOIN handyman_services hs ON h.id = hs.handyman_id
  JOIN services s ON hs.service_id = s.id
  WHERE h.is_online = true
    AND h.kyc_status = 'APPROVED'
    AND hl.location IS NOT NULL
    AND (p_category IS NULL OR s.category = p_category)
    AND st_dwithin(
      hl.location,
      st_setsrid(st_makepoint(p_client_lng, p_client_lat), 4326)::geography,
      p_radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_nearest_handymen(
  double precision, double precision, float, service_category
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_nearest_handymen(
  double precision, double precision, float, service_category
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_nearest_handymen(
  double precision, double precision, float, service_category
) TO service_role;
