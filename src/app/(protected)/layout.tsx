// Force all protected routes to be dynamic (not statically generated)
// since they depend on auth state and Supabase env vars
export const dynamic = "force-dynamic";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
