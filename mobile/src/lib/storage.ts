import { StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
export const secureStorage: StateStorage = {
  setItem: async (n, v) => await SecureStore.setItemAsync(n, v),
  getItem: async (n) => await SecureStore.getItemAsync(n),
  removeItem: async (n) => await SecureStore.deleteItemAsync(n),
};