import { createClient } from '@supabase/supabase-js';
import { parseDocument } from './document-parser';
import { classifyDocument } from './classifier';
import { extractContractMetadata } from './extractor';
import { publishNotification } from '@/lib/notifications';
import { isEmbeddingsConfigured, chunkText, generateEmbeddings } from '@/lib/embeddings';
import type { Database } from '@/types/database';
import type { ExtractionStatus, ContractStatus, DocumentType, RiskSeverity } from '@/types/contracts';

function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function processContract(contractId: string): Promise<void> {
  const supabase = getAdminClient();

  try {
    // Note: extraction_status is already set to 'processing' by the
    // process endpoint's atomic claim. No need to set it again.

    // Step 1: Get contract record (include uploaded_by for audit logging)
    const { data: contractRow, error: fetchError } = await supabase
      .from('contracts')
      .select('id, file_path, file_type, uploaded_by')
      .eq('id', contractId)
      .single();

    if (fetchError || !contractRow) throw new Error('Contract not found');

    const userId = contractRow.uploaded_by;

    // Step 2: Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('contracts')
      .download(contractRow.file_path);

    if (downloadError || !fileData) throw new Error('Failed to download file');

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Step 3: Parse text
    const text = await parseDocument(buffer, contractRow.file_type || 'application/pdf');

    // Step 4: Classify
    const classification = await classifyDocument(text);

    // Update with classification result
    const allTypeStrings = classification.all_types.map(t => t.document_type);
    const { error: classifyUpdateError } = await supabase
      .from('contracts')
      .update({
        document_type: classification.document_type as DocumentType,
        document_types: allTypeStrings,
      })
      .eq('id', contractId);

    if (classifyUpdateError) {
      throw new Error(`Failed to update classification: ${classifyUpdateError.message}`);
    }

    // Step 5: Extract metadata
    const extraction = await extractContractMetadata(text, classification.document_type);

    // Step 6: Update contract with extracted data + raw text
    const { error: extractionUpdateError } = await supabase
      .from('contracts')
      .update({
        title: extraction.title,
        counterparty_name: extraction.counterparty_name,
        summary: extraction.summary,
        effective_date: extraction.effective_date,
        expiry_date: extraction.expiry_date,
        notice_period_days: extraction.notice_period_days,
        auto_renewal: extraction.auto_renewal,
        renewal_term_months: extraction.renewal_term_months,
        governing_law: extraction.governing_law,
        raw_text: text,
        status: 'under_review' as ContractStatus,
        extraction_status: 'extracted' as ExtractionStatus,
      })
      .eq('id', contractId);

    if (extractionUpdateError) {
      throw new Error(`Failed to update extraction: ${extractionUpdateError.message}`);
    }

    // Step 7: Insert related records
    if (extraction.commercial_terms.length > 0) {
      const { error: termsError } = await supabase.from('commercial_terms').insert(
        extraction.commercial_terms.map((term) => ({
          contract_id: contractId,
          term_type: term.term_type,
          description: term.description,
          amount: term.amount ?? null,
          currency: term.currency || 'AUD',
          frequency: term.frequency ?? null,
        }))
      );
      if (termsError) {
        throw new Error(`Failed to insert commercial terms: ${termsError.message}`);
      }
    }

    if (extraction.obligations.length > 0) {
      const { error: obligationsError } = await supabase.from('obligations').insert(
        extraction.obligations.map((ob) => ({
          contract_id: contractId,
          title: ob.title,
          description: ob.description,
          obligated_party: ob.obligated_party,
          due_date: ob.due_date ?? null,
        }))
      );
      if (obligationsError) {
        throw new Error(`Failed to insert obligations: ${obligationsError.message}`);
      }
    }

    if (extraction.risk_flags.length > 0) {
      const { error: risksError } = await supabase.from('risk_flags').insert(
        extraction.risk_flags.map((rf) => ({
          contract_id: contractId,
          title: rf.title,
          description: rf.description,
          severity: rf.severity as RiskSeverity,
        }))
      );
      if (risksError) {
        throw new Error(`Failed to insert risk flags: ${risksError.message}`);
      }
    }

    if (extraction.tags.length > 0) {
      const { error: tagsError } = await supabase.from('contract_tags').insert(
        extraction.tags.map((tag) => ({
          contract_id: contractId,
          tag,
        }))
      );
      if (tagsError) {
        throw new Error(`Failed to insert tags: ${tagsError.message}`);
      }
    }

    // Step 8: Audit log (include user_id from uploaded_by)
    await supabase.from('audit_log').insert({
      contract_id: contractId,
      user_id: userId,
      action: 'ai_extraction',
      details: {
        document_type: classification.document_type,
        classification_confidence: classification.confidence,
        terms_count: extraction.commercial_terms.length,
        obligations_count: extraction.obligations.length,
        risk_flags_count: extraction.risk_flags.length,
        tags: extraction.tags,
      },
    });

    // Step 9: Generate embeddings for semantic search (non-blocking)
    if (isEmbeddingsConfigured()) {
      try {
        // Delete any existing chunks for this contract (re-processing case)
        await supabase
          .from('contract_chunks')
          .delete()
          .eq('contract_id', contractId);

        const chunks = chunkText(text);
        if (chunks.length > 0) {
          const embeddings = await generateEmbeddings(chunks);
          const rows = chunks.map((content, i) => ({
            contract_id: contractId,
            chunk_index: i,
            content,
            embedding: JSON.stringify(embeddings[i]),
          }));

          // Insert in batches of 50 to avoid payload limits
          for (let i = 0; i < rows.length; i += 50) {
            const batch = rows.slice(i, i + 50);
            const { error: chunkError } = await supabase
              .from('contract_chunks')
              .insert(batch);
            if (chunkError) {
              console.error('Failed to insert contract chunks:', chunkError.message);
              break;
            }
          }
        }
      } catch (embeddingError) {
        // Don't fail the whole ingestion if embeddings fail
        console.error('Embedding generation failed:', embeddingError);
      }
    }

    // Step 10: Notify user extraction is done
    if (userId) {
      publishNotification({
        userId,
        contractId,
        type: 'extraction_done',
        message: `"${extraction.title}" has been processed and is ready for review`,
      }).catch((err) => console.error('Failed to send extraction notification:', err));
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Mark as failed
    await supabase
      .from('contracts')
      .update({ extraction_status: 'failed' as ExtractionStatus })
      .eq('id', contractId);

    // Log the error
    await supabase.from('audit_log').insert({
      contract_id: contractId,
      action: 'ai_extraction',
      details: { error: message, status: 'failed' },
    });

    // Notify user of failure
    const { data: failedContract } = await supabase
      .from('contracts')
      .select('uploaded_by, title')
      .eq('id', contractId)
      .single();

    if (failedContract?.uploaded_by) {
      publishNotification({
        userId: failedContract.uploaded_by,
        contractId,
        type: 'extraction_failed',
        message: `Processing failed for "${failedContract.title}": ${message}`,
      }).catch((err) => console.error('Failed to send failure notification:', err));
    }

    throw error;
  }
}
