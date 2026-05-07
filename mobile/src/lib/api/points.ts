import { PointHistoryItem } from '../../types/models';
import { apiRequest } from './client';

export function getPointHistory() {
  return apiRequest<PointHistoryItem[]>('/api/points/history');
}
