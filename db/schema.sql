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

COMMIT;
