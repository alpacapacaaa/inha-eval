const simulatorDefaultUrl = 'http://52.63.156.200:8080';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? simulatorDefaultUrl;

export const apiConfig = {
  baseUrl: API_BASE_URL.replace(/\/+$/, ''),
};
