import type { ContractStatus, ExtractionStatus, DocumentType, RiskSeverity, ObligationStatus, VendorSyncStatus, InvoiceStatus } from '@/types/contracts';

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  under_review: 'Under Review',
  expired: 'Expired',
  terminated: 'Terminated',
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  terminated: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const EXTRACTION_STATUS_LABELS: Record<ExtractionStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  extracted: 'Extracted',
  verified: 'Verified',
  failed: 'Failed',
};

export const EXTRACTION_STATUS_COLORS: Record<ExtractionStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  extracted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  verified: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  master_services_agreement: 'Master Services Agreement',
  statement_of_work: 'Statement of Work',
  nda: 'NDA',
  employment_agreement: 'Employment Agreement',
  vendor_agreement: 'Vendor Agreement',
  lease_agreement: 'Lease Agreement',
  license_agreement: 'License Agreement',
  amendment: 'Amendment',
  addendum: 'Addendum',
  other: 'Other',
};

export const RISK_SEVERITY_LABELS: Record<RiskSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const RISK_SEVERITY_COLORS: Record<RiskSeverity, string> = {
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const OBLIGATION_STATUS_LABELS: Record<ObligationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
  waived: 'Waived',
};

export const OBLIGATION_STATUS_COLORS: Record<ObligationStatus, string> = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  waived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const LINK_TYPE_LABELS: Record<string, string> = {
  amendment: 'Amendment',
  addendum: 'Addendum',
  renewal: 'Renewal',
  related: 'Related',
};

export const LINK_TYPE_COLORS: Record<string, string> = {
  amendment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  addendum: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  renewal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  related: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export const VENDOR_SYNC_STATUS_LABELS: Record<VendorSyncStatus, string> = {
  not_synced: 'Not Synced',
  syncing: 'Syncing',
  synced: 'Synced',
  error: 'Error',
};

export const VENDOR_SYNC_STATUS_COLORS: Record<VendorSyncStatus, string> = {
  not_synced: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  syncing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  synced: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  open: 'Open',
  paid_in_full: 'Paid in Full',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
  voided: 'Voided',
  cancelled: 'Cancelled',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  paid_in_full: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  voided: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
