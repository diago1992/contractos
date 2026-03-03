import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processContract } from "@/lib/agents/ingestion";
import type { ExtractionStatus } from "@/types/contracts";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Atomic claim: only update if status is pending or failed.
    // This prevents duplicate processing if the endpoint is called twice.
    const admin = createAdminClient();
    const { data: claimed, error: claimError } = await admin
      .from("contracts")
      .update({ extraction_status: "processing" as ExtractionStatus })
      .eq("id", id)
      .in("extraction_status", ["pending", "failed"])
      .select("id")
      .single();

    if (claimError || !claimed) {
      // Either contract doesn't exist, or it's already being processed
      const { data: existing } = await admin
        .from("contracts")
        .select("id, extraction_status")
        .eq("id", id)
        .single();

      if (!existing) {
        return NextResponse.json(
          { error: "Contract not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Contract is already being processed or has been processed",
        },
        { status: 409 }
      );
    }

    // Process asynchronously — contract is already marked 'processing'
    processContract(id).catch((err) => {
      console.error(`Failed to process contract ${id}:`, err);
    });

    return NextResponse.json({ status: "processing" }, { status: 202 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
