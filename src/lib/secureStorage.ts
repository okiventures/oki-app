import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Supabase auth storage adapter that keeps the access/refresh tokens in the OS
 * keychain/keystore (via expo-secure-store) instead of plaintext AsyncStorage.
 *
 * Two wrinkles this handles:
 *  - SecureStore values are size-limited (~2 KB on Android); a Supabase session
 *    can exceed that, so values are transparently split into chunks.
 *  - SecureStore is not available on web, where we fall back to AsyncStorage
 *    (the browser build already stores no more than a normal web app would).
 */

const CHUNK_SIZE = 1800; // stay comfortably under the SecureStore byte limit
const countKey = (key: string) => `${key}.__chunks`;
const chunkKey = (key: string, i: number) => `${key}.__${i}`;

async function clearChunks(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(countKey(key));
  const count = countStr ? parseInt(countStr, 10) : 0;
  const deletions: Promise<void>[] = [SecureStore.deleteItemAsync(countKey(key))];
  for (let i = 0; i < count; i++) deletions.push(SecureStore.deleteItemAsync(chunkKey(key, i)));
  // also remove any legacy single-value write under the bare key
  deletions.push(SecureStore.deleteItemAsync(key));
  await Promise.all(deletions);
}

export const SupabaseAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);

    const countStr = await SecureStore.getItemAsync(countKey(key));
    if (countStr == null) {
      // no chunk metadata — fall back to a legacy single-value read
      return SecureStore.getItemAsync(key);
    }
    const count = parseInt(countStr, 10);
    let result = '';
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part == null) return null; // corrupted/partial — treat as absent
      result += part;
    }
    return result;
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);

    await clearChunks(key);
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(countKey(key), String(chunks.length));
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
    await clearChunks(key);
  },
};
