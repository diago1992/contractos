"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: () => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

function Checkbox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: CheckboxProps) {
  const isChecked = checked || indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.();
      }}
      className={cn(
        "inline-flex items-center justify-center h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isChecked ? "bg-primary text-primary-foreground" : "bg-background",
        className,
      )}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3" />
      ) : checked ? (
        <Check className="h-3 w-3" />
      ) : null}
    </button>
  );
}

export { Checkbox };
