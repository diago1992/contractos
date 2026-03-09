import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateVendorDescription } from "@/lib/agents/vendor-description";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendor_id } = await request.json();

    if (!vendor_id) {
      return NextResponse.json(
        { error: "vendor_id is required" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for both read and write
    const admin = createAdminClient();

    const { data: vendor, error: fetchError } = await admin
      .from("vendors")
      .select("name, industry")
      .eq("id", vendor_id)
      .single();

    if (fetchError || !vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const description = await generateVendorDescription(vendor.name, {
      industry: vendor.industry ?? undefined,
    });

    const { error } = await admin
      .from("vendors")
      .update({ ai_description: description })
      .eq("id", vendor_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ description });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
