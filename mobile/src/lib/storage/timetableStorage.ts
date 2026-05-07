import * as SecureStore from 'expo-secure-store';

const CART_KEY = 'inhaeval_timetable_cart_ids';
const SELECTED_KEY = 'inhaeval_timetable_selected_ids';

async function loadIds(key: string) {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    await SecureStore.deleteItemAsync(key);
    return [];
  }
}

async function saveIds(key: string, ids: string[]) {
  await SecureStore.setItemAsync(key, JSON.stringify(ids));
}

export const loadTimetableCartIds = () => loadIds(CART_KEY);
export const saveTimetableCartIds = (ids: string[]) => saveIds(CART_KEY, ids);
export const loadSelectedTimetableIds = () => loadIds(SELECTED_KEY);
export const saveSelectedTimetableIds = (ids: string[]) => saveIds(SELECTED_KEY, ids);
