const simulatorDefaultUrl = 'https://api.inha-eval.com';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? simulatorDefaultUrl;

export const apiConfig = {
  baseUrl: API_BASE_URL.replace(/\/+$/, ''),
};
