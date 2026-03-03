"use client";

import { useEffect, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type SearchMode = 'keyword' | 'semantic';

interface SearchBarProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  mode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  showModeToggle?: boolean;
}

export function SearchBar({
  value: externalValue,
  onChange,
  placeholder = 'Search contracts...',
  className,
  mode = 'keyword',
  onModeChange,
  showModeToggle = false,
}: SearchBarProps) {
  const [value, setValue] = useState(externalValue ?? '');

  useEffect(() => {
    const timer = setTimeout(() => onChange(value), 300);
    return () => clearTimeout(timer);
  }, [value, onChange]);

  useEffect(() => {
    setValue(externalValue ?? '');
  }, [externalValue, mode]);

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      <div className="relative flex-1">
        {mode === 'semantic' ? (
          <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-500" />
        ) : (
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'semantic' ? 'Ask a question about your contracts...' : placeholder}
          className="pl-9"
        />
      </div>
      {showModeToggle && onModeChange && (
        <button
          type="button"
          onClick={() => onModeChange(mode === 'keyword' ? 'semantic' : 'keyword')}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
            mode === 'semantic'
              ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300'
              : 'border-border bg-background text-muted-foreground hover:bg-accent'
          )}
          title={mode === 'semantic' ? 'Switch to keyword search' : 'Switch to AI semantic search'}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {mode === 'semantic' ? 'AI Search' : 'AI Search'}
        </button>
      )}
    </div>
  );
}
