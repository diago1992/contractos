import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/utils/constants";
import type { ContractStatus, ExtractionStatus } from "@/types/contracts";

export const maxDuration = 60;

const ALLOWED_MIMES = Object.keys(ACCEPTED_FILE_TYPES);

/**
 * Import endpoint — upload-only, no AI processing.
 * Files are stored and contract records created with extraction_status='pending'.
 * The /api/cron/process-queue cron picks them up for background processing.
 */
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
    const vendorAssignmentsRaw = formData.get("vendor_assignments") as
      | string
      | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Accept up to 10 files per chunk (client sends multiple chunks)
    if (files.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 files per request. Use chunked uploads." },
        { status: 400 }
      );
    }

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

    // Validate
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
    const created: { id: string; fileName: string }[] = [];

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
          ...(counterpartyName
            ? { counterparty_name: counterpartyName }
            : {}),
        })
        .select("id")
        .single();

      if (insertError) {
        await admin.storage.from("contracts").remove([storagePath]);
        errors.push(`${file.name}: failed to create record`);
        continue;
      }

      if (vendorId) {
        await admin.from("contract_vendors").insert({
          contract_id: contract.id,
          vendor_id: vendorId,
        });
      }

      await admin.from("audit_log").insert({
        contract_id: contract.id,
        user_id: user.id,
        action: "created",
        details: { file_name: file.name, import: true },
      });

      created.push({ id: contract.id, fileName: file.name });
    }

    return NextResponse.json(
      {
        contracts: created,
        uploaded: created.length,
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
