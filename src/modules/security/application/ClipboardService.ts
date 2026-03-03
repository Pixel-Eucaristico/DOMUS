import * as Clipboard from "expo-clipboard";
import { Alert } from "react-native";

export class ClipboardService {
  static async copy(text: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch {
      Alert.alert("Erro", "Não foi possível copiar para a área de transferência.");
      return false;
    }
  }
}
