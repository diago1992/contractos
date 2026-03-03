import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "20");
    const search = searchParams.get("search") || undefined;
    const documentType = searchParams.get("document_type") || undefined;
    const status = searchParams.get("status") || undefined;

    let query = supabase
      .from("contracts")
      .select(
        "id, title, counterparty_name, document_type, status, extraction_status, expiry_date, created_at, file_name",
        { count: "exact" }
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.textSearch("search_vector", search, {
        type: "websearch",
      });
    }
    if (documentType) {
      query = query.eq("document_type", documentType as Database["public"]["Enums"]["document_type"]);
    }
    if (status) {
      query = query.eq("status", status as Database["public"]["Enums"]["contract_status"]);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      count: count ?? 0,
      page,
      page_size: pageSize,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
