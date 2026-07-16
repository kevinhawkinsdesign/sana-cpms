'use client';

import { useState } from 'react';

// Returns false for bare IP addresses (e.g. 102.130.32.43) — those are internal RRA
// servers unreachable from the public internet, so we suppress the link.
const isPublicUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
};
import { Megaphone, ChevronDown, ChevronUp, ExternalLink, CheckCheck, RefreshCw } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useRraUnreadCount,
  useRraNotices,
  useMarkNoticeRead,
  useMarkAllNoticesRead,
  useTriggerRraFetch,
} from '@/lib/hooks/useRraNotices';
import { useAuth } from '@/lib/auth/authContext';
import { UserRole } from '@/lib/utils/roleRedirect';
import { formatRraDate, RraNotice } from '@/lib/api/rraNotices';

function NoticeItem({
  notice,
  onRead,
}: {
  notice: RraNotice;
  onRead: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded((prev) => !prev);
    if (!notice.isRead) {
      onRead(notice.id);
    }
  };

  return (
    <button
      type="button"
      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
        !notice.isRead ? 'bg-blue-50/50' : ''
      }`}
      onClick={handleToggle}
    >
      <div className="flex items-start gap-2">
        {/* Unread indicator */}
        <div className="mt-1.5 flex-shrink-0">
          {!notice.isRead ? (
            <span className="block w-2 h-2 bg-blue-500 rounded-full" />
          ) : (
            <span className="block w-2 h-2 rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p
              className={`text-sm leading-snug ${
                !notice.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
              }`}
            >
              {notice.title}
            </p>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
          </div>

          <p className="text-xs text-gray-400 mt-0.5">
            {formatRraDate(notice.rraRegDt)}
          </p>

          {expanded && (
            <div className="mt-2 space-y-1.5">
              {notice.content && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {notice.content}
                </p>
              )}
              {notice.regrNm && (
                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                  {notice.regrNm}
                </p>
              )}
              {notice.detailUrl && (
                <a
                  href={notice.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  View full notice
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function RraNoticesPanel() {
  const [open, setOpen] = useState(false);

  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;

  const { data: unreadCount = 0 } = useRraUnreadCount();
  const { data, isLoading } = useRraNotices();
  const markRead = useMarkNoticeRead();
  const markAllRead = useMarkAllNoticesRead();
  const triggerFetch = useTriggerRraFetch();

  const notices = data?.notices ?? [];
  const hasNotices = notices.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="RRA Official Notices">
          <Megaphone className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-orange-500 text-white text-xs font-medium rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-sm">RRA Official Notices</h3>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                  {unreadCount} unread
                </Badge>
              )}
              {hasNotices && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  onClick={() => triggerFetch.mutate()}
                  disabled={triggerFetch.isPending}
                  title="Fetch latest notices from RRA"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${triggerFetch.isPending ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Maintenance windows, tax changes & regulatory updates
          </p>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="p-6 text-sm text-center text-muted-foreground">
            Loading notices...
          </div>
        ) : !hasNotices ? (
          <div className="p-6 text-sm text-center text-muted-foreground">
            No notices from RRA yet
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            {notices.map((notice) => (
              <NoticeItem
                key={notice.id}
                notice={notice}
                onRead={(id) => markRead.mutate(id)}
              />
            ))}
          </ScrollArea>
        )}

      </PopoverContent>
    </Popover>
  );
}
