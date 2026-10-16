import { Alert, Platform } from "react-native";

/**
 * Pergunta e devolve true só se o usuário confirmar.
 * Na web o Alert com botões não funciona, então usa window.confirm.
 */
export function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === "web") {
    const w = globalThis as unknown as { confirm?: (msg: string) => boolean };
    return Promise.resolve(w.confirm ? w.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
