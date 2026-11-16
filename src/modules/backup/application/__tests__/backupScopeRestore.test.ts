import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_TYPES } from "@packages/events/src/types";
import { GAMIFICATION_EVENTS } from "@packages/gamification/src/types";
import { createSettingChangedEvent } from "@packages/settings";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { WISHLIST_EVENTS } from "@packages/wishlist";
import {
  buildExportEvents,
  prepareBackupForStorage,
  prepareLocalLog,
} from "@/src/context/localEventLog";
import { replayAllEvents } from "@/src/context/replay";
import {
  AI_CUSTOM_PRICES_SETTING_KEY,
  AI_SETTINGS_SETTING_KEY,
  pickSyncedAISettings,
  resolveAISettingsFromSettings,
  resolveCustomPricesFromSettings,
} from "@/src/modules/ai/domain/syncedAISettings";
import {
  DRIVE_BACKUP_PREF_SETTING_KEY,
  pickSyncedDriveBackupPref,
  resolveDriveBackupPrefFromSettings,
} from "@/src/modules/backup/domain/syncedDriveBackupPref";
import {
  IS_CATHOLIC_SETTING_KEY,
  SOUND_ENABLED_SETTING_KEY,
  SUPPORT_MODES_SETTING_KEY,
  THEME_MODE_SETTING_KEY,
  resolveIsCatholicFromSettings,
  resolveSoundEnabledFromSettings,
  resolveSupportModesFromSettings,
  resolveThemeModeFromSettings,
} from "@/src/modules/settings/syncedPreferences";
import {
  encodeGroupSecret,
  generateGroupSecret,
} from "@/src/modules/strongGroup/groupSecret";
import { buildEncryptedKeySyncEvent } from "@/src/modules/strongGroup/keySyncPublisher";
import { applyRestoredKeySyncEvents } from "@/src/modules/strongGroup/keySyncReceiver";
import {
  OCR_CONFIG_SETTING_KEY,
  pickSyncedOCRConfig,
  resolveOCRConfigFromSettings,
} from "@/src/services/syncedOCRConfig";
import type { EncryptedBackup } from "../../domain/BackupMetadata";
import { BackupCryptoService } from "../BackupCryptoService";
import { BackupExportService } from "../BackupExportService";
import { BackupImportService } from "../BackupImportService";

const writtenFiles = new Map<string, string>();

vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: vi.fn(async (_algo: string, data: string) =>
    createHash("sha256").update(data, "utf8").digest("hex"),
  ),
}));

vi.mock("../../infrastructure/FileSystemService", () => ({
  FileSystemService: {
    writeTemp: vi.fn(async (filename: string, content: string) => {
      const path = `/tmp/${filename}`;
      writtenFiles.set(path, content);
      return path;
    }),
    writeAbsolute: vi.fn(async (destPath: string, content: string) => {
      writtenFiles.set(destPath, content);
    }),
    read: vi.fn(async (filePath: string) => {
      const content = writtenFiles.get(filePath);
      if (content === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return content;
    }),
    deleteFile: vi.fn(async () => undefined),
  },
}));

vi.mock("../../infrastructure/ShareService", () => ({
  ShareService: {
    share: vi.fn(async () => undefined),
  },
}));

const AI_SECRET_KEY = "sk-secret-openai-999";
const OCR_SECRET_KEY = "AIza-secret-ocr-888";

function buildFullScopeLog(groupSecret: Uint8Array): SyncEvent[] {
  const originDevice = "dev-origem";
  let ts = 1_700_000_000_000;
  const nextTs = () => (ts += 1000);

  const accountEvent: SyncEvent = {
    id: "evt-acc-1",
    type: EVENT_TYPES.ACCOUNT_CREATED,
    payload: { id: "acc-1", name: "Carteira", type: "cash", balance: 500 },
    timestamp: nextTs(),
    deviceId: originDevice,
    signature: "",
  };

  const expenseEvent: SyncEvent = {
    id: "evt-tx-1",
    type: EVENT_TYPES.TRANSACTION_CREATED,
    payload: {
      id: "tx-1",
      accountId: "acc-1",
      type: "expense",
      amount: 120.5,
      date: "2026-10-15",
      description: "Mercado",
      categoryId: "food",
    },
    timestamp: nextTs(),
    deviceId: originDevice,
    signature: "",
  };

  const wishlistEvent: SyncEvent = {
    id: "evt-wish-1",
    type: WISHLIST_EVENTS.WISHLIST_ITEM_ADDED,
    payload: {
      item: {
        id: "wish-1",
        listId: "list-default",
        urgencyLevel: "medium",
        orderIndex: 0,
        name: "Livro de Finanças",
        price: 75,
        quantity: 1,
      },
    },
    timestamp: nextTs(),
    deviceId: originDevice,
    signature: "",
  };

  const xpEvent: SyncEvent = {
    id: "evt-xp-1",
    type: GAMIFICATION_EVENTS.XP_GAINED,
    payload: { amount: 150, source: "expense_logged" },
    timestamp: nextTs(),
    deviceId: originDevice,
    signature: "",
  };

  const achievementEvent: SyncEvent = {
    id: "evt-ach-1",
    type: GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED,
    payload: { achievementId: "first_expense", xpReward: 50, rarity: "common" },
    timestamp: nextTs(),
    deviceId: originDevice,
    signature: "",
  };

  const trophyEvent: SyncEvent = {
    id: "evt-trophy-1",
    type: GAMIFICATION_EVENTS.MONTHLY_TROPHY_COMPLETED,
    payload: { trophyId: "trophy-oct", monthKey: "2026-10", xpReward: 200 },
    timestamp: nextTs(),
    deviceId: originDevice,
    signature: "",
  };

  const settingTheme: SyncEvent = {
    ...createSettingChangedEvent(THEME_MODE_SETTING_KEY, "dark", originDevice),
    timestamp: nextTs(),
  };

  const settingSound: SyncEvent = {
    ...createSettingChangedEvent(SOUND_ENABLED_SETTING_KEY, false, originDevice),
    timestamp: nextTs(),
  };

  const settingSupport: SyncEvent = {
    ...createSettingChangedEvent(
      SUPPORT_MODES_SETTING_KEY,
      ["links", "daily_ad"],
      originDevice,
    ),
    timestamp: nextTs(),
  };

  const settingCatholic: SyncEvent = {
    ...createSettingChangedEvent(IS_CATHOLIC_SETTING_KEY, true, originDevice),
    timestamp: nextTs(),
  };

  const settingAI: SyncEvent = {
    ...createSettingChangedEvent(
      AI_SETTINGS_SETTING_KEY,
      pickSyncedAISettings({
        provider: "openai",
        modelTier: "smart",
        voiceEnabled: true,
        visionOCREnabled: true,
        budgetMode: "monthly",
        billingDay: 10,
      }),
      originDevice,
    ),
    timestamp: nextTs(),
  };

  const settingAIPrices: SyncEvent = {
    ...createSettingChangedEvent(
      AI_CUSTOM_PRICES_SETTING_KEY,
      { openai: { fast: 0.05, smart: 0.25 } },
      originDevice,
    ),
    timestamp: nextTs(),
  };

  const settingOCR: SyncEvent = {
    ...createSettingChangedEvent(
      OCR_CONFIG_SETTING_KEY,
      pickSyncedOCRConfig({
        preferredProvider: "cloudvision",
        cloudVisionEndpoint: "https://vision.googleapis.com/v1/images:annotate",
        visionAIProvider: "gemini",
      }),
      originDevice,
    ),
    timestamp: nextTs(),
  };

  const settingDrive: SyncEvent = {
    ...createSettingChangedEvent(
      DRIVE_BACKUP_PREF_SETTING_KEY,
      pickSyncedDriveBackupPref({
        enabled: true,
        email: "familia@domus.app",
      }),
      originDevice,
    ),
    timestamp: nextTs(),
  };

  const aiKeyEvent: SyncEvent = {
    ...buildEncryptedKeySyncEvent({
      secret: groupSecret,
      slot: "ai:openai",
      apiKey: AI_SECRET_KEY,
      deviceId: originDevice,
    }),
    timestamp: nextTs(),
  };

  const ocrKeyEvent: SyncEvent = {
    ...buildEncryptedKeySyncEvent({
      secret: groupSecret,
      slot: "ocr:cloud_vision",
      apiKey: OCR_SECRET_KEY,
      deviceId: originDevice,
    }),
    timestamp: nextTs(),
  };

  return [
    accountEvent,
    expenseEvent,
    wishlistEvent,
    xpEvent,
    achievementEvent,
    trophyEvent,
    settingTheme,
    settingSound,
    settingSupport,
    settingCatholic,
    settingAI,
    settingAIPrices,
    settingOCR,
    settingDrive,
    aiKeyEvent,
    ocrKeyEvent,
  ];
}

describe("Story 10.7: Backup do Drive / manual com mesmo escopo e sem chave em texto puro", () => {
  const groupSecret = generateGroupSecret();
  const encodedSecret = encodeGroupSecret(groupSecret);
  const nowMs = 1_700_000_500_000;

  beforeEach(() => {
    writtenFiles.clear();
  });

  it("exportação plana e cifrada não contêm chaves de IA ou OCR em texto puro", async () => {
    const originalEvents = buildFullScopeLog(groupSecret);
    const exportedEvents = buildExportEvents(originalEvents, "dev-origem");

    const serializedExportEvents = JSON.stringify(exportedEvents);
    expect(serializedExportEvents).not.toContain(AI_SECRET_KEY);
    expect(serializedExportEvents).not.toContain(OCR_SECRET_KEY);

    await BackupExportService.exportPlain(exportedEvents, "dev-origem", () => undefined);
    await BackupExportService.export(
      exportedEvents,
      "dev-origem",
      "senha-backup-123",
      () => undefined,
    );

    const files = [...writtenFiles.values()];
    expect(files).toHaveLength(2);

    const [plainContent, encryptedContent] = files;
    expect(plainContent).not.toContain(AI_SECRET_KEY);
    expect(plainContent).not.toContain(OCR_SECRET_KEY);
    expect(encryptedContent).not.toContain(AI_SECRET_KEY);
    expect(encryptedContent).not.toContain(OCR_SECRET_KEY);

    const envelope = JSON.parse(encryptedContent) as EncryptedBackup;
    const decryptedPayloadJson = await BackupCryptoService.decrypt(
      envelope,
      "senha-backup-123",
    );
    expect(decryptedPayloadJson).not.toContain(AI_SECRET_KEY);
    expect(decryptedPayloadJson).not.toContain(OCR_SECRET_KEY);

    const driveDestPath = "/tmp/domus-auto-backup.domusbackup";
    await BackupExportService.saveLocal(
      exportedEvents,
      "dev-origem",
      "senha-drive-456",
      driveDestPath,
    );
    const driveContent = writtenFiles.get(driveDestPath);
    expect(driveContent).toBeDefined();
    expect(driveContent).not.toContain(AI_SECRET_KEY);
    expect(driveContent).not.toContain(OCR_SECRET_KEY);

    const validated = await BackupImportService.readAndValidate(
      driveDestPath,
      "senha-drive-456",
      () => undefined,
    );
    expect(validated.wasEncrypted).toBe(true);
    const extracted = BackupImportService.extractEvents(validated.payload);
    expect(extracted).toEqual(exportedEvents);
    expect(JSON.stringify(extracted)).not.toContain(AI_SECRET_KEY);
    expect(JSON.stringify(extracted)).not.toContain(OCR_SECRET_KEY);
  });

  it("restauração em aparelho novo preserva paridade completa de gastos, desejos, troféus e preferências sincronizáveis", async () => {
    const originalEvents = buildFullScopeLog(groupSecret);
    const exportedEvents = buildExportEvents(originalEvents, "dev-origem");

    await BackupExportService.export(
      exportedEvents,
      "dev-origem",
      "senha-backup-123",
      () => undefined,
    );
    const encryptedContent = [...writtenFiles.values()][0];
    const decryptedJson = await BackupCryptoService.decrypt(
      JSON.parse(encryptedContent) as EncryptedBackup,
      "senha-backup-123",
    );
    const parsedBackup = JSON.parse(decryptedJson) as { events: SyncEvent[] };

    const stored = prepareBackupForStorage(parsedBackup.events, "dev-novo");
    const local = prepareLocalLog(stored.events, "dev-novo");

    const originalState = replayAllEvents(originalEvents, { now: nowMs });
    const restoredState = replayAllEvents(local.events, { now: nowMs });

    expect(restoredState.quarantine).toEqual([]);
    expect(Object.keys(restoredState.domain.transactions)).toHaveLength(1);
    expect(Object.keys(restoredState.wishlist.items)).toHaveLength(1);
    expect(restoredState.gamification.totalXp).toBeGreaterThan(0);
    expect(restoredState.domain).toEqual(originalState.domain);
    expect(restoredState.wishlist).toEqual(originalState.wishlist);
    expect(restoredState.gamification).toEqual(originalState.gamification);
    expect(restoredState.settings).toEqual(originalState.settings);

    expect(resolveThemeModeFromSettings(restoredState.settings)).toBe("dark");
    expect(resolveSoundEnabledFromSettings(restoredState.settings)).toBe(false);
    expect(resolveSupportModesFromSettings(restoredState.settings)).toEqual([
      "links",
      "daily_ad",
    ]);
    expect(resolveIsCatholicFromSettings(restoredState.settings)).toBe(true);
    expect(resolveAISettingsFromSettings(restoredState.settings)).toEqual({
      provider: "openai",
      modelTier: "smart",
      voiceEnabled: true,
      visionOCREnabled: true,
      budgetMode: "monthly",
      billingDay: 10,
    });
    expect(resolveCustomPricesFromSettings(restoredState.settings)).toEqual({
      openai: { fast: 0.05, smart: 0.25 },
    });
    expect(resolveOCRConfigFromSettings(restoredState.settings)).toEqual({
      preferredProvider: "cloudvision",
      cloudVisionEndpoint: "https://vision.googleapis.com/v1/images:annotate",
      visionAIProvider: "gemini",
    });
    expect(resolveDriveBackupPrefFromSettings(restoredState.settings)).toEqual({
      enabled: true,
      email: "familia@domus.app",
    });
  });

  it("restaura chaves apenas com Grupo forte + opt-in + nativo e rejeita eventos inválidos sem quebrar o restore", async () => {
    const originalEvents = buildFullScopeLog(groupSecret);
    const restored = prepareLocalLog(
      prepareBackupForStorage(buildExportEvents(originalEvents, "dev-origem"), "dev-novo").events,
      "dev-novo",
    ).events;

    const storeAIKey = vi.fn(async () => undefined);
    const storeOCRKey = vi.fn(async () => undefined);

    // 1. Sem Grupo forte (null ou código legado)
    const noGroup = await applyRestoredKeySyncEvents({
      events: restored,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => null,
      storeAIKey,
      storeOCRKey,
    });
    expect(noGroup).toEqual({ applied: 0, ignored: 2, rejected: 0 });

    const legacyGroup = await applyRestoredKeySyncEvents({
      events: restored,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => "DOMUS-LEGACY-123",
      storeAIKey,
      storeOCRKey,
    });
    expect(legacyGroup).toEqual({ applied: 0, ignored: 2, rejected: 0 });

    // 2. Com Grupo forte, mas sem opt-in ou na web
    const noOptIn = await applyRestoredKeySyncEvents({
      events: restored,
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => false,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey,
    });
    expect(noOptIn).toEqual({ applied: 0, ignored: 2, rejected: 0 });

    const onWeb = await applyRestoredKeySyncEvents({
      events: restored,
      isDemoActive: false,
      isWeb: true,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey,
    });
    expect(onWeb).toEqual({ applied: 0, ignored: 2, rejected: 0 });
    expect(storeAIKey).not.toHaveBeenCalled();
    expect(storeOCRKey).not.toHaveBeenCalled();

    // 3. Nativo + Grupo forte + opt-in + evento de outro grupo misturado
    const foreignKeyEvent: SyncEvent = {
      ...buildEncryptedKeySyncEvent({
        secret: generateGroupSecret(),
        slot: "ai:gemini",
        apiKey: "AIza-other-group",
        deviceId: "dev-other",
      }),
      timestamp: 1_700_000_100_000,
    };

    const fullRestore = await applyRestoredKeySyncEvents({
      events: [...restored, foreignKeyEvent],
      isDemoActive: false,
      isWeb: false,
      getOptIn: async () => true,
      loadStrongGroupSecret: async () => encodedSecret,
      storeAIKey,
      storeOCRKey,
    });

    expect(fullRestore).toEqual({ applied: 2, ignored: 0, rejected: 1 });
    expect(storeAIKey).toHaveBeenCalledTimes(1);
    expect(storeAIKey).toHaveBeenCalledWith("openai", AI_SECRET_KEY);
    expect(storeOCRKey).toHaveBeenCalledTimes(1);
    expect(storeOCRKey).toHaveBeenCalledWith(OCR_SECRET_KEY);
  });
});
