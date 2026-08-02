-- Availability blocks for handyman weekly schedules.
-- Mirrors the client AvailabilityBlock model: day_of_week (0=Sunday, JS getDay()),
-- start_hour/end_hour store the template hours, start_time/end_time anchor the block
-- (for ONE_OFF these are the concrete times).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_recurrence') THEN
    CREATE TYPE availability_recurrence AS ENUM ('ONE_OFF', 'WEEKLY');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS availability_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handyman_id   UUID NOT NULL REFERENCES handymen (id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_hour    SMALLINT NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour      SMALLINT NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  recurrence    availability_recurrence NOT NULL DEFAULT 'ONE_OFF',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_time_check CHECK (end_time > start_time),
  CONSTRAINT availability_hour_check CHECK (end_hour > start_hour)
);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_handyman
  ON availability_blocks (handyman_id, start_time);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_timerange
  ON availability_blocks USING GIST (tstzrange(start_time, end_time));

ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;

-- Clients need to read availability to pick a booking slot, but only from
-- approved, online handymen (mirrors handyman_locations_select_searchable).
CREATE POLICY availability_blocks_select_visible
  ON availability_blocks FOR SELECT
  TO authenticated
  USING (
    (SELECT is_admin())
    OR handyman_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.handymen h
      WHERE h.id = availability_blocks.handyman_id
        AND h.is_online = true
        AND h.kyc_status = 'APPROVED'
    )
  );

CREATE POLICY availability_blocks_insert_own
  ON availability_blocks FOR INSERT
  TO authenticated
  WITH CHECK (handyman_id = auth.uid());

CREATE POLICY availability_blocks_update_own
  ON availability_blocks FOR UPDATE
  TO authenticated
  USING (handyman_id = auth.uid())
  WITH CHECK (handyman_id = auth.uid());

CREATE POLICY availability_blocks_delete_own
  ON availability_blocks FOR DELETE
  TO authenticated
  USING (handyman_id = auth.uid());

-- Expands availability into concrete windows in [p_start_date, p_end_date).
-- Weekly rows are excluded from the range predicate and expanded by the loop,
-- which jumps straight to the first occurrence >= p_start_date.
CREATE OR REPLACE FUNCTION get_handyman_availability_blocks(
  p_handyman_id UUID,
  p_start_date  TIMESTAMPTZ,
  p_end_date    TIMESTAMPTZ
)
RETURNS TABLE (
  block_id    UUID,
  day_of_week SMALLINT,
  start_hour  SMALLINT,
  end_hour    SMALLINT,
  start_time  TIMESTAMPTZ,
  end_time    TIMESTAMPTZ,
  recurrence  TEXT
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec          RECORD;
  cur_start    TIMESTAMPTZ;
  cur_end      TIMESTAMPTZ;
BEGIN
  FOR rec IN
    SELECT ab.id, ab.day_of_week, ab.start_hour, ab.end_hour, ab.start_time, ab.end_time,
           ab.recurrence::TEXT
    FROM availability_blocks ab
    WHERE ab.handyman_id = p_handyman_id
      AND (
        ab.recurrence = 'WEEKLY'
        OR (ab.start_time < p_end_date AND ab.end_time > p_start_date)
      )
  LOOP
    IF rec.recurrence = 'ONE_OFF' THEN
      block_id := rec.id;
      day_of_week := rec.day_of_week;
      start_hour := rec.start_hour;
      end_hour := rec.end_hour;
      start_time := GREATEST(rec.start_time, p_start_date);
      end_time := LEAST(rec.end_time, p_end_date);
      recurrence := rec.recurrence;
      RETURN NEXT;
    ELSE
      cur_start := rec.start_time
        + GREATEST(CEIL(EXTRACT(EPOCH FROM (p_start_date - rec.start_time)) / 604800.0), 0)
          * INTERVAL '7 days';
      cur_end := cur_start + (rec.end_time - rec.start_time);
      WHILE cur_start < p_end_date LOOP
        block_id := rec.id;
        day_of_week := rec.day_of_week;
        start_hour := rec.start_hour;
        end_hour := rec.end_hour;
        start_time := GREATEST(cur_start, p_start_date);
        end_time := LEAST(cur_end, p_end_date);
        recurrence := rec.recurrence;
        RETURN NEXT;
        cur_start := cur_start + INTERVAL '7 days';
        cur_end := cur_end + INTERVAL '7 days';
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_handyman_availability_blocks(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM anon;
GRANT EXECUTE ON FUNCTION get_handyman_availability_blocks(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
