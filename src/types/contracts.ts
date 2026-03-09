// ============================================================================
// ContractOS - Contract Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Enum Types
// ---------------------------------------------------------------------------

export type UserRole = 'viewer' | 'contributor' | 'reviewer' | 'admin';

export type ContractStatus =
  | 'draft'
  | 'active'
  | 'under_review'
  | 'expired'
  | 'terminated';

export type ExtractionStatus =
  | 'pending'
  | 'processing'
  | 'extracted'
  | 'verified'
  | 'failed';

export type DocumentType =
  | 'master_services_agreement'
  | 'statement_of_work'
  | 'nda'
  | 'employment_agreement'
  | 'vendor_agreement'
  | 'lease_agreement'
  | 'license_agreement'
  | 'amendment'
  | 'addendum'
  | 'other';

export type ObligationStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'waived';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type NotificationType =
  | 'upload_complete'
  | 'extraction_done'
  | 'extraction_failed'
  | 'contract_expiring'
  | 'spend_threshold_warning'
  | 'spend_threshold_exceeded';

export type VendorSyncStatus = 'not_synced' | 'syncing' | 'synced' | 'error';

export type InvoiceStatus =
  | 'open'
  | 'paid_in_full'
  | 'partially_paid'
  | 'overdue'
  | 'voided'
  | 'cancelled';

export type ObligationRisk = 'High' | 'Medium' | 'Low';

export type ObligationCategory = 'payment' | 'notice' | 'compliance' | 'reporting' | 'operational' | 'legal';

// ---------------------------------------------------------------------------
// Main Entity Interfaces (mirror database tables)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  title: string;
  counterparty_name: string | null;
  document_type: DocumentType | null;
  document_types: string[] | null;
  status: ContractStatus;
  extraction_status: ExtractionStatus;
  summary: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  notice_period_days: number | null;
  auto_renewal: boolean;
  renewal_term_months: number | null;
  governing_law: string | null;
  file_path: string;
  file_name: string;
  file_size_bytes: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  search_vector: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  cost_centre: string | null;
  annual_value: number | null;
  mm_owner: string | null;
  on_file: boolean;
  notice_deadline: string | null;
}

export interface CommercialTerm {
  id: string;
  contract_id: string;
  term_type: string;
  description: string;
  amount: number | null;
  currency: string | null;
  frequency: string | null;
  created_at: string;
}

export interface Obligation {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  obligated_party: string | null;
  due_date: string | null;
  status: ObligationStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  risk: ObligationRisk | null;
  category: ObligationCategory | null;
}

export interface RiskFlag {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  severity: RiskSeverity;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ContractTag {
  id: string;
  contract_id: string;
  tag: string;
}

export interface ContractLink {
  id: string;
  parent_contract_id: string;
  child_contract_id: string;
  link_type: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  contract_id: string | null;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  contract_id: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  netsuite_vendor_id: string | null;
  netsuite_entity_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  sync_status: VendorSyncStatus;
  last_synced_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
  legal_name: string | null;
  trading_name: string | null;
  industry: string | null;
  abn: string | null;
  gst_registered: boolean;
  website: string | null;
  logo_url: string | null;
  currency: string;
  payment_terms: string | null;
  default_gl_code: string | null;
  default_tax_code: string | null;
  contact_name: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_street: string | null;
  address_city: string | null;
  address_country: string;
  bank_account_name: string | null;
  bank_bsb: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_verified: boolean;
  bank_swift: string | null;
  bank_iban: string | null;
  ai_description: string | null;
  esg_data: Record<string, unknown>;
  esg_summary: string | null;
  esg_updated_at: string | null;
}

export interface ContractVendor {
  id: string;
  contract_id: string;
  vendor_id: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  vendor_id: string;
  contract_id: string | null;
  netsuite_invoice_id: string | null;
  invoice_number: string | null;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  status: InvoiceStatus;
  invoice_date: string | null;
  due_date: string | null;
  netsuite_data: Record<string, unknown> | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  date_paid: string | null;
}

export interface Discussion {
  id: string;
  contract_id: string | null;
  vendor_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Query / Display Types
// ---------------------------------------------------------------------------

export interface ContractWithRelations extends Contract {
  commercial_terms: CommercialTerm[];
  obligations: Obligation[];
  risk_flags: RiskFlag[];
  tags: ContractTag[];
  links: ContractLink[];
  audit_log: AuditLogEntry[];
  uploaded_by_user?: User;
  verified_by_user?: User;
}

export interface ContractListItem {
  id: string;
  title: string;
  counterparty_name: string | null;
  document_type: DocumentType | null;
  status: ContractStatus;
  extraction_status: ExtractionStatus;
  effective_date: string | null;
  expiry_date: string | null;
  created_at: string;
  file_name: string;
  cost_centre: string | null;
  annual_value: number | null;
  mm_owner: string | null;
  on_file: boolean;
  notice_deadline: string | null;
}

export interface DashboardStats {
  total_active: number;
  pending_review: number;
  expiring_soon: number;
  recently_added: number;
  renewal_action_required: number;
  obligations_overdue: number;
  no_contract_on_file: number;
  spend_approaching_cap: number;
}

export interface VendorDetailData {
  vendor: Vendor;
  contracts: Contract[];
  invoices: Invoice[];
  discussions: Discussion[];
}

// ---------------------------------------------------------------------------
// AI Agent Result Types
// ---------------------------------------------------------------------------

export interface EsgFinding {
  label: string;
  value: string;
  status: 'confirmed' | 'partial' | 'not-found';
  source_text: string;
  source_url: string;
}

export interface EsgSearchResult {
  summary: string;
  findings: EsgFinding[];
}

export interface NewsItem {
  headline: string;
  url: string;
  source: string;
  date: string;
  snippet: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

// ---------------------------------------------------------------------------
// API Types
// ---------------------------------------------------------------------------

export interface ContractFilters {
  search?: string;
  document_type?: DocumentType;
  status?: ContractStatus;
  extraction_status?: ExtractionStatus;
  date_from?: string;
  date_to?: string;
  cost_centre?: string;
  mm_owner?: string;
  on_file?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// AI Extraction Result Types
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  title: string;
  counterparty_name: string;
  summary: string;
  effective_date: string | null;
  expiry_date: string | null;
  notice_period_days: number | null;
  auto_renewal: boolean;
  renewal_term_months: number | null;
  governing_law: string | null;
  commercial_terms: { term_type: string; description: string; amount?: number | null; currency?: string; frequency?: string | null }[];
  obligations: { title: string; description: string; obligated_party: string; due_date?: string | null }[];
  risk_flags: { title: string; description: string; severity: RiskSeverity }[];
  tags: string[];
}

export interface ClassificationResult {
  document_type: DocumentType;
  confidence: number;
  all_types: { document_type: DocumentType; confidence: number }[];
}
