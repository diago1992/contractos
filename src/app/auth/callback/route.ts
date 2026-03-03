import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // ignore
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Wait for the handle_new_auth_user trigger to create the public.users
      // row. On first OAuth login this happens asynchronously — without this
      // check the dashboard may load before the profile exists, causing RLS
      // to block every query.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const MAX_RETRIES = 5;
        const DELAY_MS = 500;
        for (let i = 0; i < MAX_RETRIES; i++) {
          const { data: profile } = await supabase
            .from("users")
            .select("id")
            .eq("id", user.id)
            .single();
          if (profile) break;
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
