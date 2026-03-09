"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface VendorTabsProps {
  tabs: { id: string; label: string; content: React.ReactNode }[];
}

export function VendorTabs({ tabs }: VendorTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  return (
    <div>
      <div className="cp-tabs">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={cn("cp-tab", activeTab === tab.id && "active")}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div className="cp-content">
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}

interface SubTabsProps {
  tabs: { id: string; label: string; content: React.ReactNode }[];
}

export function SubTabs({ tabs }: SubTabsProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  return (
    <div>
      <div className="sub-tabs">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={cn("sub-tab", activeTab === tab.id && "active")}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div>
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
