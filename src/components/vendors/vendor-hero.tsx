"use client";

import type { Vendor, Contract, Invoice } from '@/types/contracts';
import { differenceInDays, format } from 'date-fns';

interface VendorHeroProps {
  vendor: Vendor;
  contracts: Contract[];
  invoices: Invoice[];
}

export function VendorHero({ vendor, contracts, invoices }: VendorHeroProps) {
  const activeContracts = contracts.filter(c => c.status === 'active');
  const totalContractValue = contracts.reduce((sum, c) => sum + (c.annual_value || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid_in_full').reduce((sum, i) => sum + i.amount_paid, 0);

  const nearestExpiry = activeContracts
    .filter(c => c.expiry_date)
    .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())[0];
  const daysToRenewal = nearestExpiry?.expiry_date
    ? differenceInDays(new Date(nearestExpiry.expiry_date), new Date())
    : null;

  const lastInvoice = invoices[0];

  const metaBubbles = [
    contracts[0]?.cost_centre && `Cost Centre: ${contracts[0].cost_centre}`,
    contracts[0]?.mm_owner && `Owner: ${contracts[0].mm_owner}`,
    vendor.industry && `Industry: ${vendor.industry}`,
    contracts[0]?.id && `Contract: ${contracts[0].id.slice(0, 8)}`,
  ].filter(Boolean);

  const formatCurrency = (val: number) =>
    val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`;

  return (
    <div className="cp-hero">
      <h1>{vendor.name}</h1>
      <div className="cp-hero-meta">
        {metaBubbles.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-value">{formatCurrency(totalContractValue)}</div>
          <div className="kpi-label">Total Contract Value</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{formatCurrency(totalPaid)}</div>
          <div className="kpi-label">Total Paid</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{daysToRenewal !== null ? `${daysToRenewal}d` : '—'}</div>
          <div className="kpi-label">Days to Renewal</div>
        </div>
        <div className="kpi">
          <div className="kpi-value">{lastInvoice ? format(new Date(lastInvoice.invoice_date || lastInvoice.created_at), 'dd MMM') : '—'}</div>
          <div className="kpi-label">Last Invoice</div>
        </div>
      </div>
    </div>
  );
}
