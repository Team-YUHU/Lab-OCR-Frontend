-- Safe to run more than once: psql "$DATABASE_URL" -f db/schema.sql
-- The vials table was created separately; this only adds what the app needs to it.
BEGIN;

CREATE TABLE IF NOT EXISTS categories (
	id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
	created_at timestamptz NOT NULL DEFAULT now()
);

-- "Oil" and "oil" are the same category.
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique ON categories (lower(name));

-- NULL means uncategorized: people can move the vial to a category later.
-- RESTRICT: a category can't be deleted while vials still belong to it.
ALTER TABLE vials
	ADD COLUMN IF NOT EXISTS category_id bigint
	REFERENCES categories (id) ON DELETE RESTRICT;
ALTER TABLE vials ALTER COLUMN category_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vials_category_id ON vials (category_id);

-- Extra details people can add. None of these go in the CSV export.
ALTER TABLE vials ADD COLUMN IF NOT EXISTS name text
	CHECK (char_length(name) <= 100);
ALTER TABLE vials ADD COLUMN IF NOT EXISTS description text
	CHECK (char_length(description) <= 1000);
-- When the label was read. NULL for vials saved before this column existed.
ALTER TABLE vials ADD COLUMN IF NOT EXISTS scanned_at timestamptz;
-- Who added the vial: their Clerk user id, plus their name as it was then,
-- so the inventory doesn't have to look every author up in Clerk.
ALTER TABLE vials ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE vials ADD COLUMN IF NOT EXISTS created_by_name text;

-- The original recording or photo, stored in Cloudinary. NULL when none was kept.
ALTER TABLE vials ADD COLUMN IF NOT EXISTS media_public_id text;
ALTER TABLE vials ADD COLUMN IF NOT EXISTS media_resource_type text
	CHECK (media_resource_type IN ('video', 'image'));
ALTER TABLE vials ADD COLUMN IF NOT EXISTS media_url text;

COMMIT;
