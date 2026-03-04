"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, FileText, Menu, X, Shield, Settings, BarChart3, Calendar, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Counterparties', href: '/counterparties', icon: Building2 },
  { name: 'Upload', href: '/upload', icon: Upload },
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings/profile', icon: Settings, adminOnly: false },
  { name: 'Admin', href: '/admin/users', icon: Shield, adminOnly: true },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const userRole = currentUser?.role ?? null;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-md bg-sidebar-background text-sidebar-foreground shadow-md"
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-transform lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 h-16 border-b border-sidebar-border">
          <FileText className="h-6 w-6 text-sidebar-primary" />
          <span className="font-semibold text-lg">ContractOS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section — always visible */}
        <div className="shrink-0 border-t border-sidebar-border">
          <nav className="px-3 py-3 space-y-1">
            {bottomNavigation
              .filter((item) => !item.adminOnly || userRole === 'admin')
              .map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
          </nav>
          <div className="px-6 py-3 text-xs text-sidebar-foreground/50">
            ContractOS v0.1
          </div>
        </div>
      </aside>
    </>
  );
}
