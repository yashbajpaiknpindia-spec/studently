// Run with: npm run worker
// Long-running process for platforms without native scheduled jobs (e.g. a
// Render "Background Worker" service). Ticks every WORKER_TICK_MINUTES and
// calls the same runAggregationCycle() the /api/cron/aggregate route and the
// one-off script use — runDueSources() internally only actually fetches a
// Source once its own fetchIntervalMins has elapsed, so a short tick here is
// cheap and safe even with slow-moving sources.
//
// If your host DOES have native cron (Render Cron Jobs, GitHub Actions,
// system crontab), prefer that + the /api/cron/aggregate endpoint instead of
// running this process 24/7 — it's simpler to operate and easier to monitor.
import "dotenv/config";
import cron from "node-cron";
import { runAggregationCycle } from "../lib/aggregator/runAggregation";

const TICK_MINUTES = parseInt(process.env.WORKER_TICK_MINUTES ?? "15", 10);

let running = false;

async function tick() {
  if (running) {
    console.log("[worker] previous cycle still running, skipping this tick");
    return;
  }
  running = true;
  try {
    console.log(`[worker] cycle starting at ${new Date().toISOString()}`);
    const result = await runAggregationCycle();
    console.log("[worker] cycle finished:", result);
  } catch (err) {
    console.error("[worker] cycle failed:", err);
  } finally {
    running = false;
  }
}

console.log(`[worker] Studently Opportunity Aggregation Engine worker started — ticking every ${TICK_MINUTES}m`);
tick(); // run once immediately on boot
cron.schedule(`*/${TICK_MINUTES} * * * *`, tick);
