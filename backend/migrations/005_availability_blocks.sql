CREATE TYPE availability_recurrence AS ENUM ('ONE_OFF', 'WEEKLY');

CREATE TABLE availability_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handyman_id   UUID NOT NULL REFERENCES handymen (id) ON DELETE CASCADE,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  recurrence    availability_recurrence NOT NULL DEFAULT 'ONE_OFF',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT availability_time_check CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_blocks_handyman ON availability_blocks (handyman_id, start_time);
CREATE INDEX idx_availability_blocks_timerange ON availability_blocks USING GIST (tstzrange(start_time, end_time));

CREATE OR REPLACE FUNCTION get_handyman_availability_blocks(
  p_handyman_id UUID,
  p_start_date  TIMESTAMPTZ,
  p_end_date    TIMESTAMPTZ
)
RETURNS TABLE (
  block_id   UUID,
  start_time TIMESTAMPTZ,
  end_time   TIMESTAMPTZ,
  recurrence TEXT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  rec          RECORD;
  cur_start    TIMESTAMPTZ;
  cur_end      TIMESTAMPTZ;
BEGIN
  FOR rec IN
    SELECT id, start_time, end_time, recurrence::TEXT
    FROM availability_blocks
    WHERE handyman_id = p_handyman_id
      AND start_time < p_end_date
      AND end_time > p_start_date
  LOOP
    IF rec.recurrence = 'ONE_OFF' THEN
      block_id := rec.id;
      start_time := GREATEST(rec.start_time, p_start_date);
      end_time := LEAST(rec.end_time, p_end_date);
      recurrence := rec.recurrence;
      RETURN NEXT;
    ELSE
      cur_start := rec.start_time;
      cur_end := rec.end_time;
      WHILE cur_start < p_end_date LOOP
        IF cur_end > p_start_date THEN
          block_id := rec.id;
          start_time := GREATEST(cur_start, p_start_date);
          end_time := LEAST(cur_end, p_end_date);
          recurrence := rec.recurrence;
          RETURN NEXT;
        END IF;
        cur_start := cur_start + INTERVAL '7 days';
        cur_end := cur_end + INTERVAL '7 days';
      END LOOP;
    END IF;
  END LOOP;
END;
$$;
