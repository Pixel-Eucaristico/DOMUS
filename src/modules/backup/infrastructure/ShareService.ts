import * as Sharing from "expo-sharing";

export const ShareService = {
  async share(fileUri: string, filename: string): Promise<void> {
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
