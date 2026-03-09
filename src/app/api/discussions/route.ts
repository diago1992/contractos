import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contract_id");
    const vendorId = searchParams.get("vendor_id");

    if (!contractId && !vendorId) {
      return NextResponse.json(
        { error: "contract_id or vendor_id query param is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("discussions")
      .select("*")
      .order("created_at", { ascending: true });

    if (contractId) {
      query = query.eq("contract_id", contractId);
    }
    if (vendorId) {
      query = query.eq("vendor_id", vendorId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id, vendor_id, body: discussionBody } = await request.json();

    if (!discussionBody) {
      return NextResponse.json(
        { error: "body is required" },
        { status: 400 }
      );
    }

    if (!contract_id && !vendor_id) {
      return NextResponse.json(
        { error: "contract_id or vendor_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("discussions")
      .insert({
        contract_id: contract_id || null,
        vendor_id: vendor_id || null,
        body: discussionBody,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
