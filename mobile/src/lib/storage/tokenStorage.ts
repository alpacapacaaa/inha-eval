import * as SecureStore from 'expo-secure-store';
import { User } from '../../types/models';

const ACCESS_TOKEN_KEY = 'inhaeval_access_token';
const REFRESH_TOKEN_KEY = 'inhaeval_refresh_token';
const USER_KEY = 'inhaeval_user';

export async function saveAccessToken(token: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearAuthTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}

export async function saveCurrentUser(user: User) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getCurrentUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
}
