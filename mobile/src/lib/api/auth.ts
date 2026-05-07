import { getCurrentUser, saveAccessToken, saveCurrentUser } from '../storage/tokenStorage';
import { LoginResponse, User } from '../../types/models';
import { apiRequest } from './client';

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  nickname: string;
  department?: string;
  points: number;
}

interface SignupPayload {
  email: string;
  password: string;
  department: string;
  nickname: string;
  phoneNumber: string;
}

interface ProfileUpdatePayload {
  nickname?: string;
  department?: string;
}

async function persistSession(response: AuthResponse, email: string, fallbackDepartment?: string) {
  const user = {
    email,
    nickname: response.nickname,
    department: response.department ?? fallbackDepartment,
    points: response.points,
  };

  await saveAccessToken(response.accessToken);
  await saveCurrentUser(user);

  return user;
}

export async function login(payload: LoginPayload): Promise<User> {
  const response = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return persistSession(response, payload.email);
}

export async function signup(payload: SignupPayload): Promise<User> {
  const response = await apiRequest<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return persistSession(response, payload.email, payload.department);
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<User> {
  const currentUser = await getCurrentUser();
  const response = await apiRequest<AuthResponse>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  const nextUser = {
    email: currentUser?.email ?? '',
    nickname: response.nickname,
    department: response.department ?? currentUser?.department,
    points: response.points,
  };

  await saveAccessToken(response.accessToken);
  await saveCurrentUser(nextUser);
  return nextUser;
}

export function sendVerificationEmail(email: string) {
  return apiRequest<void>('/api/auth/email/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function sendSignupPhoneCode(phoneNumber: string) {
  return apiRequest<void>('/api/auth/phone/send', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
}

export function verifySignupPhoneCode(phoneNumber: string, code: string) {
  return apiRequest<void>('/api/auth/phone/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code }),
  });
}

export function sendPasswordResetSms(email: string, phoneNumber: string) {
  return apiRequest<void>('/api/auth/password/send', {
    method: 'POST',
    body: JSON.stringify({ email, phoneNumber }),
  });
}

export function verifyPasswordResetCode(phoneNumber: string, code: string) {
  return apiRequest<void>('/api/auth/password/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code }),
  });
}

export function resetPassword(phoneNumber: string, newPassword: string, newPasswordConfirm: string) {
  return apiRequest<void>('/api/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, newPassword, newPasswordConfirm }),
  });
}
