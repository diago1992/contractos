export interface NetSuiteVendor {
  id: string;
  entityId: string;
  companyName: string;
  email?: string;
  phone?: string;
  defaultAddress?: string;
  taxIdNum?: string;
}

export interface NetSuiteInvoice {
  id: string;
  tranId: string;
  entity: { id: string; refName: string };
  total: number;
  amountPaid: number;
  amountRemaining: number;
  currency: { id: string; refName: string };
  status: { id: string; refName: string };
  tranDate: string;
  dueDate?: string;
}

export interface CreateVendorPayload {
  companyName: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  taxIdNum?: string;
}

export interface NetSuiteSearchResult<T> {
  count: number;
  hasMore: boolean;
  items: T[];
  offset: number;
  totalResults: number;
}

export interface SuiteQLResult {
  items: Record<string, unknown>[];
  hasMore: boolean;
  totalResults: number;
}
