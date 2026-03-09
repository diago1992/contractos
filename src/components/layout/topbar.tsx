"use client";

import Link from 'next/link';

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = 'Dashboard' }: TopbarProps) {
  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      <Link href="/contracts/new" className="btn-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14" /><path d="M5 12h14" />
        </svg>
        New Contract
      </Link>
    </header>
  );
}
