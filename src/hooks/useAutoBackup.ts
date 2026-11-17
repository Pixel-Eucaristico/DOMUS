import { useEffect, useRef } from "react";
import { useAppState } from "@/src/context/AppStateProvider";
import {
  DEVICE_KEY_STORAGE,
  getDeviceBackupKey,
  getOrCreateDeviceBackupKey,
  clearDeviceBackupKey,
  isWeb,
} from "@/src/modules/backup/infrastructure/deviceBackupKey";
import {
  autoBackupFilePath,
  getLastAutoBackupTs,
  runAutoBackupIfDue,
} from "@/src/modules/backup/application/autoBackupRunner";

export {
  DEVICE_KEY_STORAGE,
  getDeviceBackupKey,
  getOrCreateDeviceBackupKey,
  clearDeviceBackupKey,
  autoBackupFilePath,
  getLastAutoBackupTs,
};

/**
 * Executa um auto-backup silencioso na inicialização do app,
 * caso tenham se passado ≥ 24 h desde o último.
 *
 * - Criptografa com a chave de dispositivo (gerada automaticamente na 1ª vez).
 * - Salva em `documentDirectory/domus-autobackup.domusbackup`.
 * - Nunca lança exceção — falhas são silenciosas para não afetar o app.
 * - Não roda na web (expo-file-system não tem documentDirectory).
 */
export function useAutoBackup() {
  const { getAllEvents, deviceId, loading } = useAppState();
  const hasCompletedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (loading || hasCompletedRef.current || inFlightRef.current || isWeb()) {
      return;
    }

    inFlightRef.current = true;
    (async () => {
      try {
        const result = await runAutoBackupIfDue({ getAllEvents, deviceId });
        if (result.completed) {
          hasCompletedRef.current = true;
        }
      } catch {
        // auto-backup é best-effort — nunca crashar o app
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [loading, deviceId, getAllEvents]);
}
