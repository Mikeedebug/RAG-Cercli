-- Extend account_fr_meta with new fields
ALTER TABLE account_fr_meta ADD COLUMN IF NOT EXISTS reporter text;
ALTER TABLE account_fr_meta ADD COLUMN IF NOT EXISTS rank integer;
ALTER TABLE account_fr_meta ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;
ALTER TABLE account_fr_meta ADD COLUMN IF NOT EXISTS fr_date text;

-- Preserve all existing signals as active (protects current data)
-- Only inserts meta rows for signals that don't have one yet
INSERT INTO account_fr_meta (account_name, feature_request_title, is_active)
SELECT DISTINCT s.account_name, s.feature_request, true
FROM signals s
ON CONFLICT (account_name, feature_request_title) DO UPDATE SET is_active = true;

-- Sentiment items table
CREATE TABLE IF NOT EXISTS sentiment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  text text NOT NULL,
  sentiment text NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sentiment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public rw on sentiment_items" ON sentiment_items FOR ALL USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON sentiment_items TO anon, authenticated;
