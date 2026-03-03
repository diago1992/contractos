"use client";

// Main application layout wrapper
// Combines Sidebar + Topbar + main content area
// Sidebar is fixed, content scrolls

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
