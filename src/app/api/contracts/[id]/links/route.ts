import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch links where this contract is parent or child
  const { data: parentLinks, error: e1 } = await supabase
    .from('contract_links')
    .select('id, parent_contract_id, child_contract_id, link_type, created_at')
    .eq('parent_contract_id', id);

  const { data: childLinks, error: e2 } = await supabase
    .from('contract_links')
    .select('id, parent_contract_id, child_contract_id, link_type, created_at')
    .eq('child_contract_id', id);

  if (e1 || e2) {
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
  }

  // Get all related contract IDs to fetch titles
  const allLinks = [...(parentLinks ?? []), ...(childLinks ?? [])];
  const relatedIds = new Set<string>();
  for (const link of allLinks) {
    if (link.parent_contract_id !== id) relatedIds.add(link.parent_contract_id);
    if (link.child_contract_id !== id) relatedIds.add(link.child_contract_id);
  }

  // Fetch titles for related contracts
  let titleMap: Record<string, string> = {};
  if (relatedIds.size > 0) {
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, title')
      .in('id', Array.from(relatedIds));

    if (contracts) {
      titleMap = Object.fromEntries(contracts.map((c) => [c.id, c.title]));
    }
  }

  // Enrich links with direction and related contract info
  const enriched = allLinks.map((link) => {
    const isParent = link.parent_contract_id === id;
    const relatedId = isParent ? link.child_contract_id : link.parent_contract_id;
    return {
      id: link.id,
      link_type: link.link_type,
      direction: isParent ? 'parent' : 'child',
      related_contract_id: relatedId,
      related_contract_title: titleMap[relatedId] || 'Unknown',
      created_at: link.created_at,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { targetContractId, linkType, direction } = body as {
    targetContractId: string;
    linkType: string;
    direction: 'parent' | 'child';
  };

  if (!targetContractId || !linkType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const parentId = direction === 'parent' ? id : targetContractId;
  const childId = direction === 'parent' ? targetContractId : id;

  const { data: link, error } = await supabase
    .from('contract_links')
    .insert({
      parent_contract_id: parentId,
      child_contract_id: childId,
      link_type: linkType,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // consume params

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const linkId = searchParams.get('linkId');

  if (!linkId) {
    return NextResponse.json({ error: 'Missing linkId' }, { status: 400 });
  }

  const { error } = await supabase
    .from('contract_links')
    .delete()
    .eq('id', linkId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
