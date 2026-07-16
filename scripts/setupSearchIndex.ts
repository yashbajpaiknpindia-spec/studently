// Run with: npm run db:search-index
// Applies prisma/sql/opportunity-search-index.sql (generated tsvector columns
// + GIN indexes) without requiring psql to be installed locally.
import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../lib/prisma";

async function main() {
  const sqlPath = path.join(__dirname, "..", "prisma", "sql", "opportunity-search-index.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  // Split on statement-terminating semicolons at line-ends; simple and fine
  // for this file since none of the statements contain embedded semicolons.
  const statements = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    console.log(`[db:search-index] running: ${statement.slice(0, 80)}...`);
    await prisma.$executeRawUnsafe(statement);
  }
  console.log("[db:search-index] done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[db:search-index] failed:", err);
  process.exit(1);
});
