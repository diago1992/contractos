"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, RefreshCcw } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalendarContracts, type CalendarContract } from '@/hooks/use-calendar';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const { data: contracts, isLoading } = useCalendarContracts(year, month);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Group contracts by expiry day
  const contractsByDay = new Map<number, CalendarContract[]>();
  for (const c of contracts ?? []) {
    const d = new Date(c.expiry_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!contractsByDay.has(day)) contractsByDay.set(day, []);
      contractsByDay.get(day)!.push(c);
    }
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  // Generate grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Renewal Calendar</h1>
            <p className="mt-1 text-muted-foreground">
              Contract expiry dates at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToday}>
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              Today
            </Button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b bg-muted/50">
              {DAY_NAMES.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const dateStr = day
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : null;
                const isToday = dateStr === todayStr;
                const dayContracts = day ? (contractsByDay.get(day) ?? []) : [];

                return (
                  <div
                    key={i}
                    className={cn(
                      'min-h-[100px] border-b border-r p-1.5 transition-colors',
                      day ? 'bg-background' : 'bg-muted/30',
                      isToday && 'bg-primary/5',
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                            isToday && 'bg-primary text-primary-foreground',
                          )}
                        >
                          {day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayContracts.map((c) => (
                            <Link key={c.id} href={`/contracts/${c.id}`}>
                              <div
                                className={cn(
                                  'cursor-pointer truncate rounded px-1.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80',
                                  c.status === 'expired'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : c.auto_renewal
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                                )}
                                title={`${c.title} — ${c.counterparty_name ?? 'Unknown'}`}
                              >
                                {c.title}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-yellow-100 dark:bg-yellow-900/30" />
            Expiring (no auto-renewal)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-green-100 dark:bg-green-900/30" />
            Auto-renewal
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-red-100 dark:bg-red-900/30" />
            Expired
          </div>
        </div>

        {/* Upcoming list below calendar */}
        {(contracts ?? []).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Upcoming Expirations</h3>
              <div className="space-y-2">
                {(contracts ?? [])
                  .filter((c) => {
                    const d = new Date(c.expiry_date);
                    return d.getFullYear() === year && d.getMonth() === month;
                  })
                  .map((c) => {
                    const expDate = new Date(c.expiry_date);
                    const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-accent">
                        <div>
                          <span className="font-medium">{c.title}</span>
                          <span className="ml-2 text-muted-foreground">— {c.counterparty_name ?? 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {expDate.toLocaleDateString('en-AU')}
                          </span>
                          <Badge variant={daysLeft <= 0 ? 'destructive' : daysLeft <= 7 ? 'default' : 'secondary'} className="text-xs">
                            {daysLeft <= 0 ? 'Expired' : `${daysLeft}d`}
                          </Badge>
                          {c.auto_renewal && (
                            <Badge variant="outline" className="text-xs">Auto-renew</Badge>
                          )}
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
