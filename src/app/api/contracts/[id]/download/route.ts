import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch file_path from contracts
  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('file_path')
    .eq('id', id)
    .single();

  if (fetchError || !contract?.file_path) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  // Generate signed URL via admin client (bypasses RLS on storage)
  const admin = createAdminClient();
  const { data: signedData, error: signError } = await admin.storage
    .from('contracts')
    .createSignedUrl(contract.file_path, 3600); // 60 min TTL

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signedData.signedUrl);
}
