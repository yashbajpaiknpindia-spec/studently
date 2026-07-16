// Run with: npm run aggregate
// Runs exactly one aggregation cycle (every due Source, then the expiry sweep) and exits.
// Good for local testing, or for platforms where you'd rather have an external
// cron (e.g. a Linux crontab, GitHub Actions schedule) invoke this script
// directly instead of hitting the /api/cron/aggregate HTTP endpoint.
import "dotenv/config";
import { runAggregationCycle } from "../lib/aggregator/runAggregation";

async function main() {
  console.log(`[aggregate] starting cycle at ${new Date().toISOString()}`);
  const result = await runAggregationCycle();
  console.log(`[aggregate] done:`, result);
  process.exit(0);
}

main().catch((err) => {
  console.error("[aggregate] fatal error:", err);
  process.exit(1);
});
