import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processContract } from "@/lib/agents/ingestion";
import type { ExtractionStatus } from "@/types/contracts";

export const maxDuration = 300;

// Process up to 3 contracts per invocation to stay within timeout
const BATCH_SIZE = 3;
// Delay between contracts to respect Anthropic rate limits
const DELAY_MS = 2000;

/**
 * Cron job: picks up pending contracts and processes them.
 * Runs every 2 minutes. Each invocation processes up to BATCH_SIZE contracts.
 * Safe to call concurrently — uses atomic claim (pending → processing).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find pending contracts, oldest first
  const { data: pending } = await admin
    .from("contracts")
    .select("id")
    .eq("extraction_status", "pending")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, message: "No pending contracts" });
  }

  const results: { id: string; status: string }[] = [];

  for (let i = 0; i < pending.length; i++) {
    const contract = pending[i];

    // Atomic claim: only update if still pending (prevents duplicate processing)
    const { data: claimed } = await admin
      .from("contracts")
      .update({ extraction_status: "processing" as ExtractionStatus })
      .eq("id", contract.id)
      .eq("extraction_status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimed) {
      // Another invocation already claimed this contract
      results.push({ id: contract.id, status: "skipped" });
      continue;
    }

    try {
      await processContract(contract.id);
      results.push({ id: contract.id, status: "success" });
    } catch (err) {
      console.error(`Queue: failed to process ${contract.id}:`, err);
      results.push({ id: contract.id, status: "failed" });
    }

    // Rate limit delay between contracts (skip after last)
    if (i < pending.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return NextResponse.json({
    processed: results.filter((r) => r.status === "success").length,
    results,
  });
}

// Vercel Cron sends GET requests
export { POST as GET };
