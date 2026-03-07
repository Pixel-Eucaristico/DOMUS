import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const UTF8 = "utf8" as const;

const isWeb = Platform.OS === "web";

// In-memory store for web (no real filesystem)
const webStore = new Map<string, string>();

export const FileSystemService = {
  async writeTemp(filename: string, content: string): Promise<string> {
    if (isWeb) {
      const path = `cache/${filename}`;
      webStore.set(path, content);
      return path;
    }
    const path = `${FileSystem.cacheDirectory ?? ""}${filename}`;
    await FileSystem.writeAsStringAsync(path, content, { encoding: UTF8 });
    return path;
  },

  async writeAbsolute(path: string, content: string): Promise<void> {
    if (isWeb) {
      webStore.set(path, content);
      return;
    }
    await FileSystem.writeAsStringAsync(path, content, { encoding: UTF8 });
  },

  async exists(uri: string): Promise<boolean> {
    if (isWeb) return webStore.has(uri);
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  },

  async read(uri: string): Promise<string> {
    if (isWeb) {
      const content = webStore.get(uri);
      if (content === undefined) throw new Error(`File not found: ${uri}`);
      return content;
    }
    return FileSystem.readAsStringAsync(uri, { encoding: UTF8 });
  },

  async deleteFile(uri: string): Promise<void> {
    if (isWeb) {
      webStore.delete(uri);
      return;
    }
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch {
      // best-effort cleanup
    }
  },
};
