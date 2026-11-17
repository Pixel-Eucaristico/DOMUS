import { describe, expect, it } from "vitest";
import { createInitialSettingsState, createSettingChangedEvent } from "@packages/settings";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { replayAllEvents } from "@/src/context/replay";
import {
  DRIVE_BACKUP_PREF_SETTING_KEY,
  buildDriveBackupPrefSeedEvents,
  pickSyncedDriveBackupPref,
  resolveDriveBackupPrefFromSettings,
  shouldPromptDriveConnectOnThisDevice,
} from "../syncedDriveBackupPref";

const FORBIDDEN_TOKEN_KEYS = [
  "accessToken",
  "refreshToken",
  "expiresAt",
  "clientId",
  "domus_gdrive_tokens_v1",
  "domus_auto_backup_device_key",
] as const;

describe("syncedDriveBackupPref (Story 9.6)", () => {
  it("sanitiza estritamente o payload permitindo apenas enabled e email não vazio, descartando tokens", () => {
    const sanitized = pickSyncedDriveBackupPref({
      enabled: true,
      email: " user@domus.app ",
      accessToken: "tok",
      refreshToken: "ref",
      expiresAt: 999,
      clientId: "cid",
      domus_gdrive_tokens_v1: "secret",
      domus_auto_backup_device_key: "key",
    });

    expect(sanitized).toEqual({
      enabled: true,
      email: "user@domus.app",
    });
    for (const key of FORBIDDEN_TOKEN_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(sanitized, key)).toBe(false);
    }

    expect(pickSyncedDriveBackupPref({ enabled: false, email: "   " })).toEqual({
      enabled: false,
    });
    expect(pickSyncedDriveBackupPref({ email: "user@domus.app" })).toBeUndefined();
    expect(pickSyncedDriveBackupPref(null)).toBeUndefined();
  });

  it("resolve a preferência pelo estado do log removendo tokens ou retornando undefined se inválido/ausente", () => {
    const initial = createInitialSettingsState();
    expect(resolveDriveBackupPrefFromSettings(initial)).toBeUndefined();

    const withPref = {
      values: {
        [DRIVE_BACKUP_PREF_SETTING_KEY]: {
          enabled: true,
          email: "a@b.com",
          accessToken: "x",
        },
      },
    };
    expect(resolveDriveBackupPrefFromSettings(withPref)).toEqual({
      enabled: true,
      email: "a@b.com",
    });

    const withInvalid = {
      values: {
        [DRIVE_BACKUP_PREF_SETTING_KEY]: { enabled: "sim" },
      },
    };
    expect(resolveDriveBackupPrefFromSettings(withInvalid)).toBeUndefined();
  });

  it("indica prompt local apenas quando backup está ativo no grupo e este aparelho não está conectado", () => {
    const prefEnabled = { enabled: true, email: "a@b.com" };
    expect(shouldPromptDriveConnectOnThisDevice(prefEnabled, false)).toBe(true);
    expect(shouldPromptDriveConnectOnThisDevice(prefEnabled, true)).toBe(false);
    expect(shouldPromptDriveConnectOnThisDevice({ enabled: false }, false)).toBe(false);
    expect(shouldPromptDriveConnectOnThisDevice(undefined, false)).toBe(false);
  });

  it("emite seed inicial após initialSyncReady apenas se conectado e sem evento prévio no log", () => {
    const notConnected = buildDriveBackupPrefSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      isConnected: false,
      email: "a@b.com",
    });
    expect(notConnected).toEqual([]);

    const seed = buildDriveBackupPrefSeedEvents({
      allEvents: [],
      deviceId: "dev-a",
      isConnected: true,
      email: " a@b.com ",
    });
    expect(seed).toHaveLength(1);
    expect(seed[0].type).toBe("SETTING_CHANGED");
    expect(seed[0].payload).toEqual({
      key: DRIVE_BACKUP_PREF_SETTING_KEY,
      value: { enabled: true, email: "a@b.com" },
      schemaVersion: 1,
    });
    const serialized = JSON.stringify(seed[0]);
    for (const key of FORBIDDEN_TOKEN_KEYS) {
      expect(serialized).not.toContain(key);
    }

    const alreadySeeded = buildDriveBackupPrefSeedEvents({
      allEvents: seed as unknown as SyncEvent[],
      deviceId: "dev-b",
      isConnected: true,
      email: "b@b.com",
    });
    expect(alreadySeeded).toEqual([]);
  });

  it("converge entre dois aparelhos via replayAllEvents pela ordem FR-16 sem tokens nos eventos", () => {
    const t1 = 1_700_000_001_000;
    const t2 = 1_700_000_002_000;

    const evtEnable = createSettingChangedEvent(
      DRIVE_BACKUP_PREF_SETTING_KEY,
      pickSyncedDriveBackupPref({ enabled: true, email: "a@b.com", accessToken: "secret" }),
      "dev-a",
    );
    const evtDisable = createSettingChangedEvent(
      DRIVE_BACKUP_PREF_SETTING_KEY,
      pickSyncedDriveBackupPref({ enabled: false }),
      "dev-a",
    );

    const eventsOrderA: SyncEvent[] = [
      { ...evtEnable, id: "evt-1", timestamp: t1 },
      { ...evtDisable, id: "evt-2", timestamp: t2 },
    ];
    const eventsOrderB: SyncEvent[] = [
      { ...evtDisable, id: "evt-2", timestamp: t2 },
      { ...evtEnable, id: "evt-1", timestamp: t1 },
    ];

    const replayedA = replayAllEvents(eventsOrderA);
    const replayedB = replayAllEvents(eventsOrderB);

    expect(replayedA.quarantine).toEqual([]);
    expect(replayedB.quarantine).toEqual([]);
    expect(resolveDriveBackupPrefFromSettings(replayedA.settings)).toEqual({
      enabled: false,
    });
    expect(resolveDriveBackupPrefFromSettings(replayedB.settings)).toEqual({
      enabled: false,
    });

    const serializedAll = JSON.stringify(eventsOrderA);
    for (const key of FORBIDDEN_TOKEN_KEYS) {
      expect(serializedAll).not.toContain(key);
    }
  });

  it("descarta email malformado ou acima de 254 caracteres em pickSyncedDriveBackupPref", () => {
    expect(pickSyncedDriveBackupPref({ enabled: true, email: "sem-arroba" })).toEqual({
      enabled: true,
    });
    const longEmail = `${"a".repeat(250)}@b.com`;
    expect(pickSyncedDriveBackupPref({ enabled: true, email: longEmail })).toEqual({
      enabled: true,
    });
  });

  it("buildDriveBackupPrefSeedEvents ignora evento prévio malformado e semeia preferência válida", () => {
    const malformedEvt = createSettingChangedEvent(
      DRIVE_BACKUP_PREF_SETTING_KEY,
      { invalid: true },
      "dev-x",
    );
    const seed = buildDriveBackupPrefSeedEvents({
      allEvents: [malformedEvt],
      deviceId: "dev-1",
      isConnected: true,
      email: "user@example.com",
    });
    expect(seed).toHaveLength(1);
    expect(seed[0].payload.value).toEqual({
      enabled: true,
      email: "user@example.com",
    });
  });
});
