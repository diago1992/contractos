import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { processContract } from "@/lib/agents/ingestion";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/utils/constants";
import type { ContractStatus, ExtractionStatus } from "@/types/contracts";

export const maxDuration = 60;

const ALLOWED_MIMES = Object.keys(ACCEPTED_FILE_TYPES);

// Delay between processing contracts to avoid API rate limits
const PROCESS_DELAY_MS = 2000;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const vendorAssignmentsRaw = formData.get("vendor_assignments") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 files per batch" },
        { status: 400 }
      );
    }

    // Parse vendor assignments: { [filename]: vendorId }
    let vendorAssignments: Record<string, string> = {};
    if (vendorAssignmentsRaw) {
      try {
        vendorAssignments = JSON.parse(vendorAssignmentsRaw);
      } catch {
        return NextResponse.json(
          { error: "Invalid vendor_assignments JSON" },
          { status: 400 }
        );
      }
    }

    // Validate all files upfront before uploading any
    const errors: string[] = [];
    for (const file of files) {
      if (!ALLOWED_MIMES.includes(file.type)) {
        errors.push(`${file.name}: invalid file type (only PDF/DOCX)`);
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 50MB limit`);
      }
    }
    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const createdContracts: { id: string; fileName: string; vendorId: string | null }[] = [];

    // Upload all files and create contract records
    for (const file of files) {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;

      const { error: uploadError } = await admin.storage
        .from("contracts")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        // Skip this file but continue with others
        errors.push(`${file.name}: upload failed - ${uploadError.message}`);
        continue;
      }

      const vendorId = vendorAssignments[file.name] || null;

      // Look up vendor name
      let counterpartyName: string | null = null;
      if (vendorId) {
        const { data: vendor } = await admin
          .from("vendors")
          .select("name")
          .eq("id", vendorId)
          .single();
        counterpartyName = vendor?.name ?? null;
      }

      const { data: contract, error: insertError } = await admin
        .from("contracts")
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ""),
          file_path: storagePath,
          file_name: file.name,
          file_size_bytes: file.size,
          file_type: file.type,
          uploaded_by: user.id,
          status: "draft" as ContractStatus,
          extraction_status: "pending" as ExtractionStatus,
          ...(counterpartyName ? { counterparty_name: counterpartyName } : {}),
        })
        .select("id")
        .single();

      if (insertError) {
        await admin.storage.from("contracts").remove([storagePath]);
        errors.push(`${file.name}: failed to create record`);
        continue;
      }

      // Link to vendor
      if (vendorId) {
        await admin.from("contract_vendors").insert({
          contract_id: contract.id,
          vendor_id: vendorId,
        });
      }

      // Audit log
      await admin.from("audit_log").insert({
        contract_id: contract.id,
        user_id: user.id,
        action: "created",
        details: { file_name: file.name, batch: true },
      });

      // Mark as pending for processing
      createdContracts.push({
        id: contract.id,
        fileName: file.name,
        vendorId,
      });
    }

    // Process contracts sequentially in the background with rate limiting
    if (createdContracts.length > 0) {
      after(async () => {
        for (let i = 0; i < createdContracts.length; i++) {
          const contract = createdContracts[i];
          try {
            // Mark as processing
            await admin
              .from("contracts")
              .update({ extraction_status: "processing" as ExtractionStatus })
              .eq("id", contract.id);

            await processContract(contract.id);
          } catch (err) {
            console.error(`Batch: failed to process ${contract.id}:`, err);
          }

          // Rate limit delay between contracts (skip after last one)
          if (i < createdContracts.length - 1) {
            await new Promise(r => setTimeout(r, PROCESS_DELAY_MS));
          }
        }
      });
    }

    return NextResponse.json(
      {
        contracts: createdContracts,
        uploaded: createdContracts.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
