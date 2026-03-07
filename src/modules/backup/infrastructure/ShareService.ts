import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import { FileSystemService } from "./FileSystemService";

export const ShareService = {
  async share(fileUri: string, filename: string): Promise<void> {
    if (Platform.OS === "web") {
      const content = await FileSystemService.read(fileUri);
      const blob = new Blob([content], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      throw new Error(
        "Compartilhamento não disponível neste dispositivo.",
      );
    }
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/octet-stream",
      dialogTitle: `Salvar backup: ${filename}`,
      UTI: "public.data",
    });
  },
};
