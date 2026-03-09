"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { InfoGrid } from './info-grid';
import type { Vendor } from '@/types/contracts';

interface BankDetailsProps {
  vendor: Vendor;
}

export function BankDetails({ vendor }: BankDetailsProps) {
  const [tab, setTab] = useState<'au' | 'intl'>('au');

  const auItems = [
    { label: 'Account Name', value: vendor.bank_account_name },
    { label: 'BSB', value: vendor.bank_bsb },
    { label: 'Account Number', value: vendor.bank_account_number },
    { label: 'Bank Name', value: vendor.bank_name },
    { label: 'Verified', value: vendor.bank_verified },
  ];

  const intlItems = [
    { label: 'Account Name', value: vendor.bank_account_name },
    { label: 'SWIFT/BIC', value: vendor.bank_swift },
    { label: 'IBAN', value: vendor.bank_iban },
    { label: 'Bank Name', value: vendor.bank_name },
  ];

  return (
    <div>
      <div className="sub-tabs" style={{ marginBottom: 16 }}>
        <div className={cn("sub-tab", tab === 'au' && "active")} onClick={() => setTab('au')}>
          Australian
        </div>
        <div className={cn("sub-tab", tab === 'intl' && "active")} onClick={() => setTab('intl')}>
          International
        </div>
      </div>
      <div className="panel">
        <InfoGrid items={tab === 'au' ? auItems : intlItems} />
      </div>
    </div>
  );
}
