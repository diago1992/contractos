"use client";

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar title={title} />
        <div className="content">
          <div className="page">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
