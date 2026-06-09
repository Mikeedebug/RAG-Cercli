-- Expand source check constraint to include 'nps'
ALTER TABLE signals DROP CONSTRAINT IF EXISTS signals_source_check;
ALTER TABLE signals ADD CONSTRAINT signals_source_check
  CHECK (source IN ('pylon', 'demodesk', 'manual', 'nps'));

-- Backfill: set source='nps' where source_id contains 'nps'
UPDATE signals SET source = 'nps' WHERE source_id ILIKE '%nps%' AND source != 'nps';
