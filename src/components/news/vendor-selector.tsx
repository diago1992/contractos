"use client";

import { cn } from '@/lib/utils';

interface VendorSelectorProps {
  vendors: string[];
  selected: string | null;
  onSelect: (name: string) => void;
}

export function VendorSelector({ vendors, selected, onSelect }: VendorSelectorProps) {
  return (
    <div className="vendor-grid">
      {vendors.map(name => (
        <button
          key={name}
          className={cn(selected === name && 'active')}
          onClick={() => onSelect(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
