"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useContracts } from '@/hooks/use-contracts';
import { Menu, X } from 'lucide-react';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { name: 'Counterparties', href: '/counterparties', icon: CounterpartiesIcon },
  { name: 'Contracts', href: '/contracts', icon: ContractsIcon, showBadge: true },
];

const insightsNav = [
  { name: 'Analytics', href: '/analytics', icon: AnalyticsIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'News', href: '/news', icon: NewsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const { data: contractsData } = useContracts({}, 1, 1);
  const contractCount = contractsData?.count ?? 0;

  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden p-2 rounded-md bg-[var(--mm-surface)] text-white shadow-md"
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "sidebar",
        mobileOpen ? "open" : ""
      )}>
        {/* Logo */}
        <div className="sidebar-logo">
          MONEYME
          <span>Contract Hub</span>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto pt-2">
          <div className="nav-section">Main</div>
          {mainNav.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn("nav-item", isActive && "active")}
              >
                <item.icon />
                {item.name}
                {item.showBadge && contractCount > 0 && (
                  <span className="nav-badge">{contractCount}</span>
                )}
              </Link>
            );
          })}

          <div className="nav-section">Insights</div>
          {insightsNav.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn("nav-item", isActive && "active")}
              >
                <item.icon />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="nav-user">
          <div className="nav-user-avatar">{initials}</div>
          <div>
            <div className="nav-user-name">{currentUser?.fullName || currentUser?.email || 'User'}</div>
            <div className="nav-user-role">{currentUser?.role || 'viewer'}</div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* SVG Icons matching HTML prototype */
function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function CounterpartiesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9h1" /><path d="M9 13h1" /><path d="M9 17h1" />
    </svg>
  );
}

function ContractsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 5 5-6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}
