import type { BackupStatus } from "@/src/modules/backup/domain/BackupMetadata";

/**
 * Roda a exportação só depois da confirmação do usuário.
 * Separado do hook para ser testável sem react-native.
 */
export async function runIfConfirmed(
  askConfirmation: () => Promise<boolean>,
  run: () => Promise<void>,
): Promise<"done" | "cancelled"> {
  if (!(await askConfirmation())) return "cancelled";
  await run();
  return "done";
}

export const PLAIN_EXPORT_WARNING = {
  title: "Exportar sem criptografia?",
  message:
    "O arquivo terá todos os seus dados financeiros legíveis, inclusive o salário e o empregador dos holerites, e, em seguida, abre o compartilhamento (Drive, e-mail, WhatsApp…). Qualquer pessoa ou serviço que receber o arquivo poderá ler tudo. Prefira o backup criptografado com senha.",
  confirmLabel: "Exportar mesmo assim",
} as const;

export interface PlainExportFlowInput {
  busyRef: { current: boolean };
  askConfirmation: () => Promise<boolean>;
  exportPlain: () => Promise<number>;
  setStatus: (status: BackupStatus) => void;
  setConfirming?: (confirming: boolean) => void;
  onBeforeExport?: () => void;
  onSuccess?: () => void;
  onError?: () => void;
}

/**
 * Orquestração pura da exportação sem criptografia (trava de toque duplo,
 * confirmação prévia e transição de status). Testável sem react-native.
 */
export async function executePlainExportFlow({
  busyRef,
  askConfirmation,
  exportPlain,
  setStatus,
  setConfirming,
  onBeforeExport,
  onSuccess,
  onError,
}: PlainExportFlowInput): Promise<"done" | "cancelled" | "busy"> {
  if (busyRef.current) return "busy";
  busyRef.current = true;
  setStatus({ type: "idle" });
  setConfirming?.(true);

  try {
    let exportedCount = 0;
    const result = await runIfConfirmed(
      async () => {
        try {
          return await askConfirmation();
        } finally {
          setConfirming?.(false);
        }
      },
      async () => {
        onBeforeExport?.();
        exportedCount = await exportPlain();
      },
    );

    if (result === "cancelled") {
      setStatus({ type: "idle" });
      return "cancelled";
    }

    setStatus({
      type: "success",
      message: `${exportedCount} eventos exportados sem criptografia.`,
    });
    onSuccess?.();
    return "done";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao exportar.";
    setStatus({ type: "error", message });
    onError?.();
    return "done";
  } finally {
    busyRef.current = false;
  }
}
