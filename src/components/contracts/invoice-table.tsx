'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '@/lib/utils/constants';
import type { Invoice, InvoiceStatus } from '@/types/contracts';
import { cn } from '@/lib/utils';

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
}

export function InvoiceTable({ invoices, isLoading }: InvoiceTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Invoices
          {invoices.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {invoices.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No invoices found for this vendor.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">
                    {inv.invoice_number ?? inv.netsuite_invoice_id ?? '\u2014'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(inv.invoice_date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(inv.due_date)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(inv.amount, inv.currency)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(inv.amount_paid, inv.currency)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(inv.amount_remaining, inv.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(INVOICE_STATUS_COLORS[inv.status as InvoiceStatus])}>
                      {INVOICE_STATUS_LABELS[inv.status as InvoiceStatus] ?? inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
