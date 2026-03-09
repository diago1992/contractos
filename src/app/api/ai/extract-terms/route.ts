import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reextractTerms } from "@/lib/agents/term-reextractor";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id } = await request.json();

    if (!contract_id) {
      return NextResponse.json(
        { error: "contract_id is required" },
        { status: 400 }
      );
    }

    const result = await reextractTerms(contract_id);

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
