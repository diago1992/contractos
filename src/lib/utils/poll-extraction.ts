import { createClient } from '@/lib/supabase/client';

export type ExtractionResult = 'extracted' | 'failed';

/**
 * Poll a contract's extraction_status until it completes or fails.
 * Returns 'extracted' on success, 'failed' on failure or timeout.
 */
export async function pollExtractionStatus(
  contractId: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<ExtractionResult> {
  const supabase = createClient();

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    const { data } = await supabase
      .from('contracts')
      .select('extraction_status')
      .eq('id', contractId)
      .single();

    if (data?.extraction_status === 'extracted' || data?.extraction_status === 'verified') {
      return 'extracted';
    }
    if (data?.extraction_status === 'failed') {
      return 'failed';
    }
  }
  return 'failed'; // timeout
}
