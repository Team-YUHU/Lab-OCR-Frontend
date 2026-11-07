-- Run once against the Tiger database: psql "$DATABASE_URL" -f db/schema.sql
CREATE TABLE IF NOT EXISTS categories (
	id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
	created_at timestamptz NOT NULL DEFAULT now()
);

-- "Oil" and "oil" are the same category.
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique ON categories (lower(name));
