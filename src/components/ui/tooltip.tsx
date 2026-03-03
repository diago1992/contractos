"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  delayDuration?: number;
}

interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  delayDuration: number;
}

const TooltipContext = React.createContext<TooltipContextValue | undefined>(
  undefined
);

function useTooltipContext() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error(
      "Tooltip components must be used within a <Tooltip> provider"
    );
  }
  return context;
}

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
TooltipProvider.displayName = "TooltipProvider";

function Tooltip({ children, delayDuration = 200 }: TooltipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ open, setOpen, delayDuration }}>
      <div className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  );
}
Tooltip.displayName = "Tooltip";

interface TooltipTriggerProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const TooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
  ({ className, ...props }, ref) => {
    const { setOpen, delayDuration } = useTooltipContext();
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleMouseEnter = React.useCallback(() => {
      timeoutRef.current = setTimeout(() => setOpen(true), delayDuration);
    }, [setOpen, delayDuration]);

    const handleMouseLeave = React.useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setOpen(false);
    }, [setOpen]);

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div
        ref={ref}
        className={cn("inline-flex", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        {...props}
      />
    );
  }
);
TooltipTrigger.displayName = "TooltipTrigger";

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
}

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", sideOffset = 4, children, ...props }, ref) => {
    const { open } = useTooltipContext();

    if (!open) return null;

    const sideClasses = {
      top: "bottom-full left-1/2 -translate-x-1/2 mb-0",
      bottom: "top-full left-1/2 -translate-x-1/2 mt-0",
      left: "right-full top-1/2 -translate-y-1/2 mr-0",
      right: "left-full top-1/2 -translate-y-1/2 ml-0",
    };

    const sideOffsetStyle = {
      top: { marginBottom: sideOffset },
      bottom: { marginTop: sideOffset },
      left: { marginRight: sideOffset },
      right: { marginLeft: sideOffset },
    };

    return (
      <div
        ref={ref}
        role="tooltip"
        className={cn(
          "absolute z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95",
          sideClasses[side],
          className
        )}
        style={sideOffsetStyle[side]}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
