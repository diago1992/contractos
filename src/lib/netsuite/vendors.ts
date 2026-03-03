import { netsuiteRequest, netsuiteSuiteQL } from './auth';
import type { NetSuiteVendor, NetSuiteSearchResult, CreateVendorPayload } from '@/types/netsuite';

export async function searchVendors(query: string): Promise<NetSuiteVendor[]> {
  const encoded = encodeURIComponent(query);
  const result = await netsuiteRequest<NetSuiteSearchResult<NetSuiteVendor>>(
    'GET',
    `/record/v1/vendor?q=${encoded}&limit=20`
  );
  return result.items ?? [];
}

export async function getVendor(internalId: string): Promise<NetSuiteVendor> {
  return netsuiteRequest<NetSuiteVendor>('GET', `/record/v1/vendor/${internalId}`);
}

export async function createVendorInNetSuite(data: CreateVendorPayload): Promise<{ id: string }> {
  const body: Record<string, unknown> = {
    companyName: data.companyName,
  };
  if (data.email) body.email = data.email;
  if (data.phone) body.phone = data.phone;
  if (data.taxIdNum) body.taxIdNum = data.taxIdNum;
  if (data.addressLine1) {
    body.addressBook = {
      items: [
        {
          addressBookAddress: {
            addr1: data.addressLine1,
            country: { id: 'AU' },
          },
          defaultBilling: true,
        },
      ],
    };
  }

  // NetSuite returns a Location header with the new record URL
  const result = await netsuiteRequest<{ id?: string }>('POST', '/record/v1/vendor', body);
  return { id: result.id ?? '' };
}

export async function getVendorInvoices(vendorInternalId: string) {
  const query = `
    SELECT
      t.id,
      t.tranid AS invoice_number,
      t.total,
      t.amountpaid,
      t.amountremaining,
      t.currency,
      t.status,
      t.trandate,
      t.duedate
    FROM transaction t
    WHERE t.entity = ${Number(vendorInternalId)}
      AND t.type = 'VendBill'
    ORDER BY t.trandate DESC
  `;

  const result = await netsuiteSuiteQL<{
    id: string;
    invoice_number: string;
    total: number;
    amountpaid: number;
    amountremaining: number;
    currency: string;
    status: string;
    trandate: string;
    duedate: string | null;
  }>(query);

  return result.items;
}
