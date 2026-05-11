import { InquiryItem } from '../../types/models';
import { apiRequest } from './client';

export function submitInquiry(payload: { category: string; title: string; content: string }) {
  return apiRequest<InquiryItem>('/api/inquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMyInquiries() {
  return apiRequest<InquiryItem[]>('/api/inquiries/my');
}
