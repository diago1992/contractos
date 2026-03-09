import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { publishNotification } from "@/lib/notifications";
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from "@/lib/utils/constants";
import type { ContractStatus, ExtractionStatus } from "@/types/contracts";

const ALLOWED_MIMES = Object.keys(ACCEPTED_FILE_TYPES);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const vendorId = formData.get("vendor_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and DOCX are accepted." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB." },
        { status: 400 }
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.id}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage using admin client (bypasses storage RLS)
    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from("contracts")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Look up vendor name if vendor_id provided
    let counterpartyName: string | null = null;
    if (vendorId) {
      const { data: vendor } = await adminClient
        .from("vendors")
        .select("name")
        .eq("id", vendorId)
        .single();
      counterpartyName = vendor?.name ?? null;
    }

    // Create contract record using admin client (bypasses RLS race condition
    // where the user's profile row may not yet exist after first OAuth login)
    const { data: contract, error: insertError } = await adminClient
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
      // Clean up uploaded file on failure
      await adminClient.storage.from("contracts").remove([storagePath]);
      return NextResponse.json(
        { error: `Failed to create contract: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Audit log
    await adminClient.from("audit_log").insert({
      contract_id: contract.id,
      user_id: user.id,
      action: "created",
      details: {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      },
    });

    // Link contract to vendor if vendor_id provided
    if (vendorId) {
      await adminClient.from("contract_vendors").insert({
        contract_id: contract.id,
        vendor_id: vendorId,
      });
    }

    // Notify user of upload
    publishNotification({
      userId: user.id,
      contractId: contract.id,
      type: 'upload_complete',
      message: `"${file.name}" uploaded successfully and is being processed`,
    }).catch((err) => console.error('Failed to send upload notification:', err));

    return NextResponse.json({ id: contract.id }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
