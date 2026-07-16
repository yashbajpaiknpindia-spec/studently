-- Opportunity Aggregation Engine — full-text search index
--
-- `prisma db push` can create the plain "tsv" column declared as
-- Unsupported("tsvector") in schema.prisma, but it can't express a PostgreSQL
-- GENERATED ALWAYS AS (...) STORED column or a GIN index — those aren't
-- representable in the Prisma schema language. Run this once after every
-- `npm run db:generate` / `prisma db push` (it's idempotent, safe to re-run):
--
--   npm run db:search-index
--
-- (or `psql "$DATABASE_URL" -f prisma/sql/opportunity-search-index.sql` directly)

ALTER TABLE "Job" DROP COLUMN IF EXISTS "tsv";
ALTER TABLE "Job" ADD COLUMN "tsv" tsvector GENERATED ALWAYS AS (
  to_tsvector(
    'english',
    coalesce("role", '') || ' ' || coalesce("company", '') || ' ' || coalesce("location", '') || ' ' || coalesce("searchText", '')
  )
) STORED;
CREATE INDEX IF NOT EXISTS "Job_tsv_idx" ON "Job" USING GIN ("tsv");

ALTER TABLE "Scholarship" DROP COLUMN IF EXISTS "tsv";
ALTER TABLE "Scholarship" ADD COLUMN "tsv" tsvector GENERATED ALWAYS AS (
  to_tsvector(
    'english',
    coalesce("title", '') || ' ' || coalesce("providerName", '') || ' ' || coalesce("location", '') || ' ' || coalesce("searchText", '')
  )
) STORED;
CREATE INDEX IF NOT EXISTS "Scholarship_tsv_idx" ON "Scholarship" USING GIN ("tsv");
