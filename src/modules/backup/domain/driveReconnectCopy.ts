/**
 * Textos em pt-BR (com acentuação completa) e formatadores puros para o fluxo
 * de reconexão única do Google Drive (Story 8.9) e listagem de backups em appDataFolder.
 */

export const DRIVE_RECONNECT_COPY = {
  bannerTitle: "Reconecte sua conta do Google Drive uma única vez",
  bannerCta: "Reconectar Google Drive",
  disconnectLegacyLabel: "Desconectar conta anterior",
  disconnectLegacyConfirmTitle: "Desconectar conta anterior?",
  disconnectLegacyConfirmMessage:
    "Isso remove os dados locais da conexão antiga neste aparelho. Seu backup já salvo no Google Drive não será apagado.",
  disconnectLegacyConfirmCta: "Desconectar",
  subtitleNeedsReconnect: "Reconexão necessária — seu backup está seguro",
  lastRecordedBackupPrefix: "Último backup registrado:",
  backupsSectionTitle: "Backups salvos no Google Drive",
  backupsLoading: "Verificando backups no Google Drive…",
  backupsEmpty: "Nenhum backup encontrado na nuvem ainda.",
  backupsLoadError:
    "Não foi possível listar os backups agora. Sua conexão continua ativa.",
  backupsLoadOffline:
    "Sem conexão com a internet para listar os backups agora.",
  backupsLoadAuthError:
    "A autorização do Google Drive expirou ou foi revogada. Reconecte sua conta para continuar.",
  unknownDate: "Data indisponível",
  unknownSize: "Tamanho indisponível",
} as const;

export function buildLegacyReconnectMessage(previousEmail: string | null): string {
  const email = previousEmail?.trim();
  const accountText = email ? ` (${email})` : "";
  return (
    `Atualizamos a conexão com o Google Drive para o novo padrão de segurança do Google. ` +
    `Reconecte sua conta${accountText} uma única vez para continuar enviando backups automáticos. ` +
    `Seu backup existente na nuvem não foi apagado e continuará disponível após a reconexão.`
  );
}

export function formatBackupFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return DRIVE_RECONNECT_COPY.unknownSize;
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",")} GB`;
}

export function formatBackupModifiedTime(
  isoOrMs: string | number | null | undefined,
  timeZone?: string,
): string {
  if (isoOrMs === null || isoOrMs === undefined || isoOrMs === "") {
    return DRIVE_RECONNECT_COPY.unknownDate;
  }
  const date = new Date(isoOrMs);
  if (Number.isNaN(date.getTime())) {
    return DRIVE_RECONNECT_COPY.unknownDate;
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });
}
