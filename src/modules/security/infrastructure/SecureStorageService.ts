import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export class SecureStorageService {
  static async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return null;
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }

  static async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return;
    await SecureStore.setItemAsync(key, value);
  }

  static async delete(key: string): Promise<void> {
    if (Platform.OS === "web") return;
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore — key may not exist
    }
  }
}
