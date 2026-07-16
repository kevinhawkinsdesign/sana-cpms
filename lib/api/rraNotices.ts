import api from './api';

export interface RraNotice {
  id: string;
  noticeNo: string;
  title: string;
  content: string; // "cont" from RRA — displayed as notice type
  regrNm: string | null; // "regrNm" from RRA — displayed as notice body/content
  detailUrl: string | null;
  rraRegDt: string; // YYYYMMDDHHMMSS
  fetchedAt: string;
  isRead: boolean;
  readAt: string | null;
}

export interface RraNoticesResponse {
  notices: RraNotice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface UnreadCountResponse {
  count: number;
}

export const getRraNotices = async (
  page = 1,
  limit = 20
): Promise<RraNoticesResponse> => {
  const response = await api().get<{ data: RraNoticesResponse }>(
    `/api/ebm/rra-notices?page=${page}&limit=${limit}`
  );
  return response.data.data;
};

export const getUnreadNoticeCount = async (): Promise<number> => {
  const response = await api().get<{ data: UnreadCountResponse }>(
    '/api/ebm/rra-notices/unread-count'
  );
  return response.data.data.count;
};

export const markNoticeAsRead = async (noticeId: string): Promise<void> => {
  await api().post(`/api/ebm/rra-notices/${noticeId}/read`);
};

export const markAllNoticesAsRead = async (): Promise<void> => {
  await api().post('/api/ebm/rra-notices/read-all');
};

export const triggerRraNoticesFetch = async (): Promise<{ newNotices: number }> => {
  const response = await api().post<{ data: { newNotices: number } }>(
    '/api/ebm/rra-notices/fetch'
  );
  return response.data.data;
};

export const fetchNoticeContent = async (noticeId: string): Promise<string> => {
  const response = await api(false, false).get<{ data: { content: string } }>(
    `/api/ebm/rra-notices/${noticeId}/content`
  );
  return response.data.data.content;
};

/**
 * Parse a VSDC date string "YYYYMMDDHHMMSS" into a human-readable format
 */
export function formatRraDate(rraRegDt: string): string {
  if (!rraRegDt || rraRegDt.length < 8) return rraRegDt;
  const year = rraRegDt.slice(0, 4);
  const month = rraRegDt.slice(4, 6);
  const day = rraRegDt.slice(6, 8);
  const hour = rraRegDt.slice(8, 10);
  const min = rraRegDt.slice(10, 12);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthName = months[parseInt(month, 10) - 1] || month;

  if (hour && min) {
    return `${day} ${monthName} ${year} ${hour}:${min}`;
  }
  return `${day} ${monthName} ${year}`;
}
