-- Zeitplaner-BK schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE priority_level AS ENUM ('important', 'optional');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  google_refresh_token TEXT,
  google_access_token TEXT,
  google_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parent items (synced to Google Calendar)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT,
  priority priority_level NOT NULL DEFAULT 'optional',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  google_event_id TEXT,
  google_recurring_event_id TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sub-items (app-only, template for recurring series)
CREATE TABLE sub_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled sub-item',
  description TEXT,
  priority priority_level NOT NULL DEFAULT 'optional',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Materialized instance for a specific day of a recurring item
CREATE TABLE item_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  master_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  instance_date DATE NOT NULL,
  google_instance_id TEXT,
  title TEXT,
  description TEXT,
  priority priority_level,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (master_item_id, instance_date)
);

-- Excluded single occurrences (deleted "this event only")
CREATE TABLE excluded_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  master_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  instance_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (master_item_id, instance_date)
);

-- Per-instance sub-item state
CREATE TABLE sub_item_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES item_instances(id) ON DELETE CASCADE,
  sub_item_id UUID NOT NULL REFERENCES sub_items(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  priority priority_level,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (instance_id, sub_item_id)
);

-- Links (items, sub-items, or instance overrides)
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  sub_item_id UUID REFERENCES sub_items(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES item_instances(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Images metadata (files in Supabase Storage)
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  sub_item_id UUID REFERENCES sub_items(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES item_instances(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_start_time ON items(start_time);
CREATE INDEX idx_sub_items_item_id ON sub_items(item_id);
CREATE INDEX idx_item_instances_master_date ON item_instances(master_item_id, instance_date);
CREATE INDEX idx_excluded_instances_master_date ON excluded_instances(master_item_id, instance_date);
CREATE INDEX idx_links_item_id ON links(item_id);
CREATE INDEX idx_links_sub_item_id ON links(sub_item_id);
CREATE INDEX idx_images_item_id ON images(item_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sub_items_updated_at BEFORE UPDATE ON sub_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER item_instances_updated_at BEFORE UPDATE ON item_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sub_item_states_updated_at BEFORE UPDATE ON sub_item_states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE excluded_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_item_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users manage own items" ON items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own sub_items" ON sub_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own item_instances" ON item_instances
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own excluded_instances" ON excluded_instances
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own sub_item_states" ON sub_item_states
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own links" ON links
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own images" ON images
  FOR ALL USING (auth.uid() = user_id);

-- Storage bucket (run in Supabase dashboard or via API)
-- Bucket: item-images, public: false, RLS on storage.objects
