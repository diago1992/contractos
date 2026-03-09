"use client";

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { AppLayout } from '@/components/layout/app-layout';
import { useAllContracts } from '@/hooks/use-contracts';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: contracts } = useAllContracts();

  const today = new Date();

  // Build days array — derive from currentMonth (stable state)
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const result = [];
    let day = calStart;
    while (day <= calEnd) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [currentMonth]);

  // Build events from contracts
  const events = useMemo(() => {
    if (!contracts) return [];
    const evts: { date: Date; label: string; type: 'renewal' | 'deadline' | 'review' }[] = [];
    contracts.forEach(c => {
      if (c.expiry_date) {
        evts.push({ date: new Date(c.expiry_date), label: `${c.counterparty_name || c.title} - Renewal`, type: 'renewal' });
      }
      if (c.notice_deadline) {
        evts.push({ date: new Date(c.notice_deadline), label: `${c.counterparty_name || c.title} - Notice Deadline`, type: 'deadline' });
      }
    });
    return evts;
  }, [contracts]);

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(e.date, day));

  // Upcoming events (next 60 days)
  const upcoming = events
    .filter(e => e.date >= today && e.date <= addDays(today, 60))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 10);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <AppLayout title="Calendar">
      <div className="dash-row two-col">
        {/* Calendar grid */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn-secondary" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{format(currentMonth, 'MMMM yyyy')}</span>
            <button className="btn-secondary" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <div className="cal-grid">
            {weekDays.map(d => (
              <div key={d} className="cal-header">{d}</div>
            ))}
            {days.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={i}
                  className={`cal-day ${isSameDay(day, today) ? 'today' : ''} ${!isSameMonth(day, currentMonth) ? 'other-month' : ''}`}
                >
                  <div className="cal-day-num">{format(day, 'd')}</div>
                  {dayEvents.slice(0, 2).map((evt, j) => (
                    <div key={j} className={`cal-event ${evt.type}`}>{evt.label}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="panel">
          <div className="panel-title">Upcoming Events</div>
          {upcoming.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-50)' }}>No upcoming events</p>
          ) : (
            <div className="act-list">
              {upcoming.map((evt, i) => (
                <div key={i} className="act-item">
                  <div className={`act-dot ${evt.type === 'deadline' ? 'danger' : 'warn'}`} />
                  <div className="act-text">
                    <div style={{ fontWeight: 500 }}>{evt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-50)' }}>{format(evt.date, 'dd MMM yyyy')}</div>
                  </div>
                  <span className={`badge ${evt.type === 'deadline' ? 'expired' : 'expiring'}`}>
                    {evt.type === 'deadline' ? 'Deadline' : 'Renewal'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
