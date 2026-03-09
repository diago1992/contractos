import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { searchVendorEsg } from "@/lib/agents/esg-search";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendor_id, vendor_name } = await request.json();

    if (!vendor_id || !vendor_name) {
      return NextResponse.json(
        { error: "vendor_id and vendor_name are required" },
        { status: 400 }
      );
    }

    const result = await searchVendorEsg(vendor_name);

    // Use admin client to bypass RLS for vendor update
    const admin = createAdminClient();
    const { error } = await admin
      .from("vendors")
      .update({
        esg_data: JSON.parse(JSON.stringify(result)),
        esg_summary: result.summary,
        esg_updated_at: new Date().toISOString(),
      })
      .eq("id", vendor_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
