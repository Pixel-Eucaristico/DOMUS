import { appConfirm } from "@/src/services/appAlert";

export interface ConfirmAsyncOptions {
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Pergunta e devolve true só se o usuário confirmar.
 * Usa o alerta customizado do app (igual no Android, iOS e web).
 */
export function confirmAsync(
  title: string,
  message: string,
  confirmLabel: string,
  options?: ConfirmAsyncOptions,
): Promise<boolean> {
  return appConfirm({
    title,
    message,
    confirmLabel,
    cancelLabel: options?.cancelLabel ?? "Cancelar",
    destructive: options?.destructive ?? false,
  });
}
