import * as FileSystem from "expo-file-system";

// EncodingType.UTF8 foi removido do namespace na v17+; usa literal diretamente
const UTF8 = "utf8" as const;

export const FileSystemService = {
  async writeTemp(filename: string, content: string): Promise<string> {
    const path = `${FileSystem.cacheDirectory ?? ""}${filename}`;
    await FileSystem.writeAsStringAsync(path, content, { encoding: UTF8 });
    return path;
  },

  async writeAbsolute(path: string, content: string): Promise<void> {
    await FileSystem.writeAsStringAsync(path, content, { encoding: UTF8 });
  },

  async exists(uri: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  },

  async read(uri: string): Promise<string> {
    return FileSystem.readAsStringAsync(uri, { encoding: UTF8 });
  },

  async deleteFile(uri: string): Promise<void> {
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
