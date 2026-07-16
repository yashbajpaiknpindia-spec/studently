import { NextRequest, NextResponse } from "next/server";
import { runAggregationCycle } from "@/lib/aggregator/runAggregation";

// Protects the endpoint with a shared secret rather than a user session, since
// it's meant to be called by an external scheduler (Render Cron Jobs, a
// GitHub Actions schedule, etc.) rather than a logged-in person.
// Set CRON_SECRET in your environment and configure the scheduler to call:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron/aggregate
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runAggregationCycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Aggregation cycle failed." }, { status: 500 });
  }
}

// Convenience for manual triggering from a browser during setup/debugging —
// still requires the same secret, just as a query param instead of a header.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = new URL(req.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await runAggregationCycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Aggregation cycle failed." }, { status: 500 });
  }
}
