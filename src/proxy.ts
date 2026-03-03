import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets
     * - Slack API routes (need raw body for signature verification)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/slack|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
