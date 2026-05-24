// SSL Pinning 적용 시: react-native-ssl-pinning 라이브러리 필요
// 프로덕션에서는 fetch 대신 아래처럼 교체해 MITM을 차단한다.
//
//   import { fetch as pinnedFetch } from 'react-native-ssl-pinning';
//   pinnedFetch(url, { ...init, sslPinning: { certs: ['api.inha-eval.com'] } })
//
// 개발 환경(Proxyman/Charles)에서는 핀을 제거해야 하므로
// EXPO_PUBLIC_DISABLE_SSL_PINNING=true 환경변수로 on/off를 분리한다.
import { apiConfig } from './config';
import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
} from '../storage/tokenStorage';

const DEFAULT_ERROR_MESSAGE = '요청 처리 중 오류가 발생했습니다.';
const REQUEST_TIMEOUT_MS = 10000;
let unauthorizedHandler: (() => Promise<void> | void) | null = null;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function setUnauthorizedHandler(handler: (() => Promise<void> | void) | null) {
  unauthorizedHandler = handler;
}

interface RefreshResponse {
  accessToken?: string;
  refreshToken?: string;
}

function parseErrorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return DEFAULT_ERROR_MESSAGE;
  }

  const record = data as Record<string, unknown>;
  if (typeof record.message === 'string') {
    return record.message;
  }

  const firstText = Object.values(record).find((value) => typeof value === 'string');
  return typeof firstText === 'string' ? firstText : DEFAULT_ERROR_MESSAGE;
}

function isAuthFailure(status: number) {
  return status === 401 || status === 403;
}

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${apiConfig.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as RefreshResponse;
  if (!data.accessToken) {
    return null;
  }

  await saveAccessToken(data.accessToken);
  if (data.refreshToken) {
    await saveRefreshToken(data.refreshToken);
  }

  return data.accessToken;
}

export async function apiRequest<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const requestUrl = `${apiConfig.baseUrl}${path}`;
  let response: Response;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(requestUrl, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다.');
    }
    if (error instanceof Error && error.message.includes('Network request failed')) {
      throw new Error(
        `서버에 연결하지 못했습니다. 현재 주소: ${apiConfig.baseUrl}. Expo를 완전히 다시 시작했는지 확인해주세요.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorData: unknown = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    const message = parseErrorMessage(errorData);

    if (isAuthFailure(response.status)) {
      const refreshedToken = retried ? null : await refreshAccessToken();
      if (refreshedToken) {
        return apiRequest<T>(path, init, true);
      }

      if (unauthorizedHandler) {
        await unauthorizedHandler();
      }

      throw new ApiError(response.status, '로그인이 만료되었습니다. 다시 로그인해주세요.');
    }

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
