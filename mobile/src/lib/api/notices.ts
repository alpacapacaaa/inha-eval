import { NoticeItem } from '../../types/models';
import { apiRequest } from './client';

export function getNotices() {
  return apiRequest<NoticeItem[]>('/api/notices');
}
