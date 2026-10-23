import * as Clipboard from "expo-clipboard";
import { appAlert } from "@/src/services/appAlert";

export class ClipboardService {
  static async copy(text: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch {
      appAlert("Erro", "Não foi possível copiar para a área de transferência.");
      return false;
    }
  }
}
