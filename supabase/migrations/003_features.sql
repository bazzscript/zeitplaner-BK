-- Step vs note; activity templates (app-only)

DO $$ BEGIN
  CREATE TYPE sub_item_kind AS ENUM ('step', 'note');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE sub_items
  ADD COLUMN IF NOT EXISTS kind sub_item_kind NOT NULL DEFAULT 'step';

CREATE TABLE IF NOT EXISTS activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  priority priority_level NOT NULL DEFAULT 'optional',
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_templates_user ON activity_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_items_title ON items (user_id, title);
CREATE INDEX IF NOT EXISTS idx_sub_items_title ON sub_items (user_id, title);

ALTER TABLE activity_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates" ON activity_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER activity_templates_updated_at BEFORE UPDATE ON activity_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
