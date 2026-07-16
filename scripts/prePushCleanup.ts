// Run with: npm run db:pre-push-cleanup (also runs automatically as part of `npm run
// build`, right before `prisma db push`). Two independent fixes for things `prisma db
// push` can't safely reconcile on its own once real data/columns already exist:
//
// 1. DEDUPE — schema.prisma has always declared
//      @@unique([ingestSourceId, externalId])
//    on both Job and Scholarship. If any duplicate pairs already exist in the live
//    table (e.g. from before the constraint was first applied), `db push` fails
//    outright with a duplicate-key error, with no interactive prompt to fix it on a
//    CI/Render build. This merges duplicates first: keeps the most recently updated
//    row in each group (the "survivor"), re-points any Application/SavedItem rows that
//    referenced a "loser" row at the survivor instead (so nothing gets orphaned), then
//    deletes the losers.
//
// 2. GENERATED COLUMN DROP — the "tsv" tsvector column on Job/Scholarship is a Postgres
//    `GENERATED ALWAYS AS (...) STORED` column, created by raw SQL (see
//    scripts/setupSearchIndex.ts, which always runs right after `db push` in the build
//    chain) rather than by Prisma itself — schema.prisma only declares it as
//    `Unsupported("tsvector")?` since Prisma can't express generated columns. Once that
//    column exists from a prior deploy, `db push` tries to reconcile it against the
//    Unsupported declaration and fails, because Postgres only allows a generated
//    column's expression to change via `DROP EXPRESSION`, not a normal `ALTER COLUMN`.
//    Dropping it here (before push) and letting setupSearchIndex.ts recreate it (after
//    push) sidesteps that entirely — same pattern the project already used for
//    same-deploy column recreation, just extended to survive across deploys too.
//
// Both steps are idempotent — safe to run on every build, no-ops once already clean.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DROP_GENERATED_COLUMNS_SQL = `
DROP INDEX IF EXISTS "Job_tsv_idx";
ALTER TABLE "Job" DROP COLUMN IF EXISTS "tsv";
DROP INDEX IF EXISTS "Scholarship_tsv_idx";
ALTER TABLE "Scholarship" DROP COLUMN IF EXISTS "tsv";
`;

const DEDUPE_JOB_SQL = `
DO $$
DECLARE removed integer;
BEGIN
  CREATE TEMP TABLE _job_losers ON COMMIT DROP AS
  SELECT id AS loser_id,
         first_value(id) OVER (
           PARTITION BY "ingestSourceId", "externalId"
           ORDER BY "updatedAt" DESC, id DESC
         ) AS survivor_id
  FROM "Job"
  WHERE "ingestSourceId" IS NOT NULL AND "externalId" IS NOT NULL;

  DELETE FROM _job_losers WHERE loser_id = survivor_id;

  UPDATE "Application" a SET "jobId" = jl.survivor_id
  FROM _job_losers jl WHERE a."jobId" = jl.loser_id;

  UPDATE "SavedItem" si SET "jobId" = jl.survivor_id
  FROM _job_losers jl WHERE si."jobId" = jl.loser_id;

  DELETE FROM "Job" j USING _job_losers jl WHERE j.id = jl.loser_id;

  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'Job dedupe: removed % duplicate row(s)', removed;
END $$;
`;

const DEDUPE_SCHOLARSHIP_SQL = `
DO $$
DECLARE removed integer;
BEGIN
  CREATE TEMP TABLE _scholarship_losers ON COMMIT DROP AS
  SELECT id AS loser_id,
         first_value(id) OVER (
           PARTITION BY "ingestSourceId", "externalId"
           ORDER BY "updatedAt" DESC, id DESC
         ) AS survivor_id
  FROM "Scholarship"
  WHERE "ingestSourceId" IS NOT NULL AND "externalId" IS NOT NULL;

  DELETE FROM _scholarship_losers WHERE loser_id = survivor_id;

  UPDATE "Application" a SET "scholarshipId" = sl.survivor_id
  FROM _scholarship_losers sl WHERE a."scholarshipId" = sl.loser_id;

  UPDATE "SavedItem" si SET "scholarshipId" = sl.survivor_id
  FROM _scholarship_losers sl WHERE si."scholarshipId" = sl.loser_id;

  DELETE FROM "Scholarship" s USING _scholarship_losers sl WHERE s.id = sl.loser_id;

  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'Scholarship dedupe: removed % duplicate row(s)', removed;
END $$;
`;

async function main() {
  console.log("[pre-push] dropping generated tsv columns/indexes (if present) so db push doesn't try to alter them...");
  try {
    for (const statement of DROP_GENERATED_COLUMNS_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
    console.log("[pre-push] tsv columns dropped — setupSearchIndex.ts will recreate them after db push.");
  } catch (err) {
    console.log("[pre-push] tsv drop skipped (likely a fresh database with no existing tables yet):", (err as Error).message);
  }

  console.log("[pre-push] checking for duplicate (ingestSourceId, externalId) rows before prisma db push...");
  try {
    await prisma.$executeRawUnsafe(DEDUPE_JOB_SQL);
    await prisma.$executeRawUnsafe(DEDUPE_SCHOLARSHIP_SQL);
    console.log("[pre-push] dedupe done — safe to run `prisma db push` now.");
  } catch (err) {
    // If the tables/columns referenced here don't exist yet (e.g. a brand-new database
    // that hasn't been pushed even once), there's nothing to dedupe — let db push proceed
    // and create everything fresh.
    console.log("[pre-push] dedupe skipped (likely a fresh database with no existing tables yet):", (err as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[pre-push] fatal error:", err);
  process.exit(1);
});
