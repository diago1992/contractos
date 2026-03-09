import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchVendorNews } from "@/lib/agents/vendor-news";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendor_name } = await request.json();

    if (!vendor_name) {
      return NextResponse.json(
        { error: "vendor_name is required" },
        { status: 400 }
      );
    }

    const results = await searchVendorNews(vendor_name);

    return NextResponse.json({ articles: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
