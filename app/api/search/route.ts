import { NextRequest, NextResponse } from "next/server";
import { searchOpportunities } from "@/lib/aggregator/search";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";
  const kind = (searchParams.get("kind") as "JOB" | "SCHOLARSHIP" | "ALL") ?? "ALL";
  const location = searchParams.get("location") ?? undefined;

  if (!query.trim()) return NextResponse.json({ results: [] });

  const results = await searchOpportunities({ query, kind, location });
  return NextResponse.json({ results });
}
