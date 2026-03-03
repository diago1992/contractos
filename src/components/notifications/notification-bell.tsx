"use client";

import { Bell, Check, Trash2, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatRelativeDate } from '@/lib/utils/formatters';

const TYPE_LABELS: Record<string, string> = {
  upload_complete: 'Upload',
  extraction_done: 'Extraction',
  extraction_failed: 'Error',
  contract_expiring: 'Expiring',
};

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[420px] overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex items-start gap-3 px-2 py-2 rounded-sm transition-colors',
                !n.read && 'bg-primary/5'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    {TYPE_LABELS[n.type] || n.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatRelativeDate(n.created_at)}
                  </span>
                </div>
                <p className="text-sm mt-0.5 line-clamp-2">{n.message}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 mt-1">
                {!n.read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
