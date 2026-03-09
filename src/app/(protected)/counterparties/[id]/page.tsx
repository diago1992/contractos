"use client";

import { useState, useRef, type ChangeEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { AppLayout } from '@/components/layout/app-layout';
import { VendorHero } from '@/components/vendors/vendor-hero';
import { VendorTabs, SubTabs } from '@/components/vendors/vendor-tabs';
import { InfoGrid } from '@/components/vendors/info-grid';
import { BankDetails } from '@/components/vendors/bank-details';
import { EsgPanel } from '@/components/vendors/esg-panel';
import { AiDescription } from '@/components/vendors/ai-description';
import { DiscussionThread } from '@/components/discussions/discussion-thread';
import { useVendorDetail } from '@/hooks/use-vendor-detail';
import { useExtractTerms, useExtractObligations } from '@/hooks/use-ai-features';
import type { CommercialTerm, Obligation, AuditLogEntry } from '@/types/contracts';

export default function CounterpartyDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading } = useVendorDetail(id);
  const extractTerms = useExtractTerms();
  const extractObligations = useExtractObligations();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vendor_id', id);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Upload failed');
        return;
      }
      const { id: contractId } = await res.json();

      // Auto-trigger AI processing
      fetch(`/api/process/${contractId}`, { method: 'POST' }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ['vendor-detail', id] });
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const firstContract = data?.contracts[0];

  // Fetch terms for first contract
  const { data: terms } = useQuery({
    queryKey: ['commercial-terms', firstContract?.id],
    enabled: !!firstContract?.id,
    queryFn: async () => {
      const { data: t, error } = await supabase
        .from('commercial_terms')
        .select('*')
        .eq('contract_id', firstContract!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return t as CommercialTerm[];
    },
  });

  // Fetch obligations for first contract
  const { data: obligations } = useQuery({
    queryKey: ['obligations', firstContract?.id],
    enabled: !!firstContract?.id,
    queryFn: async () => {
      const { data: o, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('contract_id', firstContract!.id)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return o as Obligation[];
    },
  });

  // Fetch audit log
  const { data: auditLog } = useQuery({
    queryKey: ['audit-log', firstContract?.id],
    enabled: !!firstContract?.id,
    queryFn: async () => {
      const { data: a, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('contract_id', firstContract!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return a as AuditLogEntry[];
    },
  });

  if (isLoading) {
    return (
      <AppLayout title="Loading...">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout title="Not Found">
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-50)' }}>
          <p>Counterparty not found.</p>
          <Link href="/counterparties" className="btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>
            Back to Counterparties
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { vendor, contracts, invoices, discussions } = data;

  const termTypeClass = (type: string) => {
    if (type.includes('payment')) return 'payment';
    if (type.includes('pricing') || type.includes('fee')) return 'pricing';
    if (type.includes('penalty')) return 'penalty';
    if (type.includes('liability') || type.includes('cap')) return 'liability';
    if (type.includes('insurance')) return 'insurance';
    return '';
  };

  // ----- Contract Tab -----
  const contractTab = (
    <SubTabs tabs={[
      {
        id: 'overview',
        label: 'Overview',
        content: (
          <div>
            {firstContract?.summary && (
              <div className="ai-desc-box" style={{ marginBottom: 20 }}>
                <div className="ai-desc-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                </div>
                <div className="ai-desc-text">{firstContract.summary}</div>
              </div>
            )}
            {firstContract ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="panel">
                  <div className="panel-title">Contract Details</div>
                  <InfoGrid items={[
                    { label: 'Title', value: firstContract.title },
                    { label: 'Document Type', value: firstContract.document_type?.replace(/_/g, ' ') },
                    { label: 'Status', value: firstContract.status },
                    { label: 'Governing Law', value: firstContract.governing_law },
                    { label: 'Auto Renewal', value: firstContract.auto_renewal },
                    { label: 'Cost Centre', value: firstContract.cost_centre },
                    { label: 'Annual Value', value: firstContract.annual_value ? `$${firstContract.annual_value.toLocaleString()}` : null },
                    { label: 'MM Owner', value: firstContract.mm_owner },
                  ]} />
                </div>
                <div className="panel">
                  <div className="panel-title">Key Dates</div>
                  <InfoGrid items={[
                    { label: 'Effective Date', value: firstContract.effective_date ? format(new Date(firstContract.effective_date), 'dd MMM yyyy') : null },
                    { label: 'Expiry Date', value: firstContract.expiry_date ? format(new Date(firstContract.expiry_date), 'dd MMM yyyy') : null },
                    { label: 'Notice Period', value: firstContract.notice_period_days ? `${firstContract.notice_period_days} days` : null },
                    { label: 'Notice Deadline', value: firstContract.notice_deadline ? format(new Date(firstContract.notice_deadline), 'dd MMM yyyy') : null },
                    { label: 'Renewal Term', value: firstContract.renewal_term_months ? `${firstContract.renewal_term_months} months` : null },
                    { label: 'On File', value: firstContract.on_file },
                  ]} />
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-50)', textAlign: 'center', padding: 40 }}>No contracts linked to this vendor.</p>
            )}
          </div>
        ),
      },
      {
        id: 'terms',
        label: 'Terms',
        content: (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-50)' }}>{terms?.length ?? 0} terms extracted</span>
              {firstContract && (
                <button
                  className="btn-primary"
                  onClick={() => extractTerms.mutate(firstContract.id)}
                  disabled={extractTerms.isPending}
                >
                  {extractTerms.isPending ? 'Extracting...' : 'Extract Terms'}
                </button>
              )}
            </div>
            {terms && terms.length > 0 ? (
              <table className="terms-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map(t => (
                    <tr key={t.id}>
                      <td><span className={`term-type ${termTypeClass(t.term_type)}`}>{t.term_type}</span></td>
                      <td>{t.description}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{t.amount ? `${t.currency || '$'}${t.amount.toLocaleString()}` : '—'}</td>
                      <td>{t.frequency || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-50)', textAlign: 'center', padding: 40 }}>No terms extracted yet. Click &quot;Extract Terms&quot; to analyse the contract.</p>
            )}
          </div>
        ),
      },
      {
        id: 'obligations',
        label: 'Obligations',
        content: (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-50)' }}>{obligations?.length ?? 0} obligations</span>
              {firstContract && (
                <button
                  className="btn-primary"
                  onClick={() => extractObligations.mutate(firstContract.id)}
                  disabled={extractObligations.isPending}
                >
                  {extractObligations.isPending ? 'Extracting...' : 'Extract Obligations'}
                </button>
              )}
            </div>
            {obligations && obligations.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Obligation</th>
                      <th>Party</th>
                      <th>Due Date</th>
                      <th>Risk</th>
                      <th>Category</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obligations.map(ob => (
                      <tr key={ob.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{ob.title}</div>
                          {ob.description && <div style={{ fontSize: 11, color: 'var(--text-50)', marginTop: 2 }}>{ob.description}</div>}
                        </td>
                        <td>{ob.obligated_party || '—'}</td>
                        <td>{ob.due_date ? format(new Date(ob.due_date), 'dd MMM yyyy') : '—'}</td>
                        <td><span className={`badge ${ob.risk === 'High' ? 'expired' : ob.risk === 'Medium' ? 'expiring' : 'active'}`}>{ob.risk || '—'}</span></td>
                        <td>{ob.category || '—'}</td>
                        <td><span className={`badge ${ob.status === 'completed' ? 'active' : ob.status === 'overdue' ? 'expired' : 'draft'}`}>{ob.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-50)', textAlign: 'center', padding: 40 }}>No obligations extracted yet.</p>
            )}
          </div>
        ),
      },
      {
        id: 'documents',
        label: 'Documents',
        content: (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--text-50)' }}>{contracts.length} document(s)</span>
              <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleFileUpload} />
            </div>
            {contracts.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.file_name}</td>
                        <td>{c.document_type?.replace(/_/g, ' ') || '—'}</td>
                        <td><span className={`badge ${c.extraction_status === 'extracted' || c.extraction_status === 'verified' ? 'active' : c.extraction_status === 'failed' ? 'expired' : 'draft'}`}>{c.extraction_status}</span></td>
                        <td>{format(new Date(c.created_at), 'dd MMM yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: 'var(--text-50)', textAlign: 'center', padding: 40 }}>No documents uploaded.</p>
            )}
          </div>
        ),
      },
    ]} />
  );

  // ----- Counterparty Tab -----
  const counterpartyTab = (
    <SubTabs tabs={[
      {
        id: 'details',
        label: 'Vendor Details',
        content: (
          <div className="panel">
            <InfoGrid items={[
              { label: 'Legal Name', value: vendor.legal_name },
              { label: 'Trading Name', value: vendor.trading_name },
              { label: 'ABN', value: vendor.abn },
              { label: 'GST Registered', value: vendor.gst_registered },
              { label: 'Industry', value: vendor.industry },
              { label: 'Website', value: vendor.website },
              { label: 'Currency', value: vendor.currency },
              { label: 'Payment Terms', value: vendor.payment_terms },
              { label: 'Default GL Code', value: vendor.default_gl_code },
              { label: 'Default Tax Code', value: vendor.default_tax_code },
              { label: 'Contact Name', value: vendor.contact_name },
              { label: 'Contact Title', value: vendor.contact_title },
              { label: 'Contact Email', value: vendor.contact_email },
              { label: 'Contact Phone', value: vendor.contact_phone },
              { label: 'Street Address', value: vendor.address_street },
              { label: 'City', value: vendor.address_city },
              { label: 'Country', value: vendor.address_country },
            ]} />
          </div>
        ),
      },
      {
        id: 'bank',
        label: 'Bank Details',
        content: <BankDetails vendor={vendor} />,
      },
      {
        id: 'esg',
        label: 'ESG',
        content: <EsgPanel vendor={vendor} />,
      },
    ]} />
  );

  // ----- Invoicing Tab -----
  const invoicingTab = (
    <div>
      {invoices.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Date</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--mono)' }}>{inv.invoice_number || inv.id.slice(0, 8)}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>${inv.amount.toLocaleString()}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>${inv.amount_paid.toLocaleString()}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>${inv.amount_remaining.toLocaleString()}</td>
                  <td>{inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '—'}</td>
                  <td>{inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy') : '—'}</td>
                  <td>
                    <span className={`badge ${inv.status === 'paid_in_full' ? 'paid' : inv.status === 'overdue' ? 'overdue' : inv.status === 'open' ? 'open' : inv.status === 'partially_paid' ? 'expiring' : 'draft'}`}>
                      {inv.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--text-50)', textAlign: 'center', padding: 40 }}>No invoices for this vendor.</p>
      )}
    </div>
  );

  // ----- Audit Tab -----
  const auditTab = (
    <div>
      {auditLog && auditLog.length > 0 ? (
        <div className="audit-timeline">
          {auditLog.map(entry => (
            <div key={entry.id} className="audit-entry">
              <div className="audit-dot" />
              <div style={{ flex: 1 }}>
                <span className="audit-action">{entry.action}</span>
                <div className="audit-detail">
                  {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm')}
                  {entry.details && typeof entry.details === 'object' && (
                    <span> — {JSON.stringify(entry.details)}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-50)', textAlign: 'center', padding: 40 }}>No audit history.</p>
      )}
    </div>
  );

  // ----- Discussion Tab -----
  const discussionTab = (
    <DiscussionThread vendorId={vendor.id} contractId={firstContract?.id} />
  );

  return (
    <AppLayout title={vendor.name}>
      <Link
        href="/counterparties"
        style={{ fontSize: 13, color: 'var(--text-50)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, textDecoration: 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        Back to Counterparties
      </Link>

      <VendorHero vendor={vendor} contracts={contracts} invoices={invoices} />

      <AiDescription vendorId={vendor.id} description={vendor.ai_description} />

      <VendorTabs tabs={[
        { id: 'contract', label: 'Contract', content: contractTab },
        { id: 'counterparty', label: 'Counterparty', content: counterpartyTab },
        { id: 'invoicing', label: 'Invoicing', content: invoicingTab },
        { id: 'audit', label: 'Audit', content: auditTab },
        { id: 'discussion', label: 'Discussion', content: discussionTab },
      ]} />
    </AppLayout>
  );
}
