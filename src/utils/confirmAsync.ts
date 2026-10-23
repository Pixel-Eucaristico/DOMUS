import { appConfirm } from "@/src/services/appAlert";

/**
 * Pergunta e devolve true só se o usuário confirmar.
 * Usa o alerta customizado do app (igual no Android, iOS e web).
 */
export function confirmAsync(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return appConfirm({ title, message, confirmLabel, cancelLabel: "Cancelar", destructive: true });
}
