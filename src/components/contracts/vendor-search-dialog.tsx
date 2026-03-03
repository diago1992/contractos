'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useVendors } from '@/hooks/use-vendors';
import { useLinkVendor } from '@/hooks/use-vendor-mutations';

interface VendorSearchDialogProps {
  contractId: string;
  open: boolean;
  onClose: () => void;
}

export function VendorSearchDialog({ contractId, open, onClose }: VendorSearchDialogProps) {
  const [search, setSearch] = useState('');
  const { data: vendors = [], isLoading } = useVendors(search || undefined);
  const linkMutation = useLinkVendor(contractId);

  const handleLink = (vendorId: string) => {
    linkMutation.mutate(vendorId, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Existing Vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Searching...</p>
            ) : vendors.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {search ? 'No vendors found' : 'Type to search vendors'}
              </p>
            ) : (
              vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  onClick={() => handleLink(vendor.id)}
                  disabled={linkMutation.isPending}
                >
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    {vendor.email && (
                      <p className="text-xs text-muted-foreground">{vendor.email}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" disabled={linkMutation.isPending}>
                    Link
                  </Button>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
