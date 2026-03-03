'use client';

import { useState } from 'react';
import { Building2, RefreshCw, Unlink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VendorSearchDialog } from './vendor-search-dialog';
import { VendorCreateDialog } from './vendor-create-dialog';
import { useUnlinkVendor, useSyncVendorToNetSuite } from '@/hooks/use-vendor-mutations';
import { VENDOR_SYNC_STATUS_LABELS, VENDOR_SYNC_STATUS_COLORS } from '@/lib/utils/constants';
import type { Vendor, VendorSyncStatus } from '@/types/contracts';
import { cn } from '@/lib/utils';

interface VendorPanelProps {
  contractId: string;
  vendor: Vendor | null;
  isLoading: boolean;
  canEdit: boolean;
}

export function VendorPanel({ contractId, vendor, isLoading, canEdit }: VendorPanelProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const unlinkMutation = useUnlinkVendor(contractId);
  const syncMutation = useSyncVendorToNetSuite();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!vendor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No vendor linked to this contract.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSearch(true)}>
                  Link Existing Vendor
                </Button>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  Create Vendor
                </Button>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No vendor linked to this contract.
            </p>
          )}

          {showSearch && (
            <VendorSearchDialog
              contractId={contractId}
              open={showSearch}
              onClose={() => setShowSearch(false)}
            />
          )}
          {showCreate && (
            <VendorCreateDialog
              contractId={contractId}
              open={showCreate}
              onClose={() => setShowCreate(false)}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Vendor</CardTitle>
          <Badge className={cn(VENDOR_SYNC_STATUS_COLORS[vendor.sync_status as VendorSyncStatus])}>
            {VENDOR_SYNC_STATUS_LABELS[vendor.sync_status as VendorSyncStatus]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-medium">{vendor.name}</p>
          </div>
          {vendor.email && (
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm">{vendor.email}</p>
            </div>
          )}
          {vendor.phone && (
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm">{vendor.phone}</p>
            </div>
          )}
          {vendor.tax_id && (
            <div>
              <p className="text-xs text-muted-foreground">ABN / Tax ID</p>
              <p className="text-sm">{vendor.tax_id}</p>
            </div>
          )}
          {vendor.address && (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="text-sm">{vendor.address}</p>
            </div>
          )}
          {vendor.netsuite_vendor_id && (
            <div>
              <p className="text-xs text-muted-foreground">NetSuite ID</p>
              <p className="text-sm font-mono">{vendor.netsuite_vendor_id}</p>
            </div>
          )}
        </div>

        {vendor.sync_error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {vendor.sync_error}
          </div>
        )}

        {canEdit && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate({ vendorId: vendor.id })}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')} />
              {vendor.netsuite_vendor_id ? 'Re-sync' : 'Push to NetSuite'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => unlinkMutation.mutate(vendor.id)}
              disabled={unlinkMutation.isPending}
            >
              <Unlink className="h-4 w-4" />
              Unlink
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
