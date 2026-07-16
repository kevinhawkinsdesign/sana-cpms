'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getRraNotices,
  getUnreadNoticeCount,
  markNoticeAsRead,
  markAllNoticesAsRead,
  triggerRraNoticesFetch,
} from '@/lib/api/rraNotices';

const UNREAD_COUNT_KEY = ['rra-notices', 'unread-count'];
const NOTICES_KEY = (page: number) => ['rra-notices', 'list', page];

/**
 * Poll the unread count every 5 minutes.
 * When the count increases, show a toast so the user is actively notified.
 */
export function useRraUnreadCount() {
  const prevCountRef = useRef<number | null>(null);

  const query = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadNoticeCount,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const current = query.data;
    if (current === undefined) return;

    const prev = prevCountRef.current;

    // Only fire toast when count goes UP (new notices arrived), not on first load
    if (prev !== null && current > prev) {
      const newCount = current - prev;
      toast.warning(
        `${newCount} new official notice${newCount > 1 ? 's' : ''} from RRA`,
        {
          description: 'Click the megaphone icon to read them.',
          duration: 8000,
        }
      );
    }

    prevCountRef.current = current;
  }, [query.data]);

  return query;
}

/**
 * Fetch paginated notices list
 */
export function useRraNotices(page = 1) {
  return useQuery({
    queryKey: NOTICES_KEY(page),
    queryFn: () => getRraNotices(page, 100),
    staleTime: 60 * 1000,
  });
}

/**
 * Mark a single notice as read and invalidate count
 */
export function useMarkNoticeRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNoticeAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      queryClient.invalidateQueries({ queryKey: ['rra-notices', 'list'] });
    },
  });
}

/**
 * Mark all notices as read and invalidate count
 */
export function useMarkAllNoticesRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNoticesAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      queryClient.invalidateQueries({ queryKey: ['rra-notices', 'list'] });
    },
  });
}

/**
 * Manually trigger a fresh fetch from VSDC (admin only)
 */
export function useTriggerRraFetch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: triggerRraNoticesFetch,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      queryClient.invalidateQueries({ queryKey: ['rra-notices', 'list'] });
      if (data.newNotices > 0) {
        toast.success(`Fetched ${data.newNotices} new notice${data.newNotices > 1 ? 's' : ''} from RRA`);
      } else {
        toast.info('No new notices from RRA');
      }
    },
    onError: () => {
      toast.error('Failed to fetch notices from RRA');
    },
  });
}
