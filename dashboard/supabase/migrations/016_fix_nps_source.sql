-- Fix NPS signals: set source='nps' where source_id contains 'nps'
-- so the source column is the single source of truth
UPDATE signals SET source = 'nps' WHERE source_id ILIKE '%nps%' AND source != 'nps';
