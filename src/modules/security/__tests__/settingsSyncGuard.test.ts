import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_SETTING_KEYS,
  CURRENT_SETTING_SCHEMA_VERSION,
  SETTINGS_EVENTS,
  createInitialSettingsState,
  createSettingChangedEvent,
  isAllowedSettingKey,
  settingsReducer,
  type SettingChangedEvent,
} from "@packages/settings";
import { replayAllEvents } from "@/src/context/replay";
import {
  partitionOldGroupEvents,
  selectEventsToImport,
  selectOldGroupPushEvents,
  selectStrongGroupPushEvents,
} from "@/src/modules/syncPayload";
import type { SyncEvent } from "@packages/storage/src/eventStore";

const ROOT = path.resolve(__dirname, "../../../..");
const INVENTORY_PATH = path.join(ROOT, "docs/inventario-dados.md");
const CANONICAL_ALLOWLIST_FILE = "packages/settings/src/types.ts";

interface InventoryRow {
  key: string;
  aliases: string[];
  classification: string;
}

function stripBackticks(value: string): string {
  return value.replace(/^`+|`+$/g, "").trim();
}

function extractBacktickKeys(cell: string): string[] {
  const matches = Array.from(cell.matchAll(/`([^`]+)`/g)).map((m) => m[1].trim());
  if (matches.length > 0) return matches;
  return [stripBackticks(cell)];
}

function parseInventoryRows(markdown: string): InventoryRow[] {
  const rows: InventoryRow[] = [];
  const lines = markdown.split(/\r?\n/);
  let inInventorySection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+Inventário Completo\b/i.test(trimmed)) {
      inInventorySection = true;
      continue;
    }
    if (inInventorySection && /^##\s+/.test(trimmed)) {
      break;
    }
    if (!inInventorySection || !trimmed.startsWith("|")) continue;

    const cells = trimmed
      .slice(1, trimmed.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((cell) => cell.trim());

    if (cells.length < 5) continue;
    if (cells[0] === "Chave" || /^[-:\s]+$/.test(cells[0])) continue;

    const keys = extractBacktickKeys(cells[0]);
    rows.push({
      key: keys[0],
      aliases: keys.slice(1),
      classification: stripBackticks(cells[3]),
    });
  }

  return rows;
}

function isTestFile(filePath: string): boolean {
  return (
    filePath.includes(`${path.sep}__tests__${path.sep}`) ||
    /\.(test|spec)\.[jt]sx?$/.test(filePath)
  );
}

function collectProductionTsFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, "/");

    if (relPath === "packages/sync" || relPath.startsWith("packages/sync/")) {
      continue;
    }

    if (entry.isDirectory()) {
      collectProductionTsFiles(fullPath, out);
    } else if (/\.(?:[jt]sx?|mjs|cjs)$/.test(entry.name) && !isTestFile(fullPath)) {
      out.push(fullPath);
    }
  }
}

function buildForgedSettingEvent(key: string, value: unknown): SettingChangedEvent {
  return {
    id: `evt-forged-${key}`,
    type: SETTINGS_EVENTS.SETTING_CHANGED,
    payload: {
      key,
      value,
      schemaVersion: CURRENT_SETTING_SCHEMA_VERSION,
    },
    timestamp: 1_700_000_000_000,
    deviceId: "dev-attacker",
    signature: "sig-forged",
  };
}

function assertKeyRejectedEverywhere(key: string): void {
  expect(
    isAllowedSettingKey(key),
    `isAllowedSettingKey deve recusar "${key}"`,
  ).toBe(false);

  expect(
    () => createSettingChangedEvent(key as never, "forged-value"),
    `createSettingChangedEvent deve lançar erro para "${key}"`,
  ).toThrow();

  const initialState = settingsReducer(
    createInitialSettingsState(),
    createSettingChangedEvent("domus_theme_mode_v1", "dark"),
  );
  const forgedEvent = buildForgedSettingEvent(key, "forged-value");
  const nextState = settingsReducer(initialState, forgedEvent);

  expect(nextState).toBe(initialState);
  expect(Object.prototype.hasOwnProperty.call(nextState.values, key)).toBe(false);

  const validSeedEvent: SyncEvent = {
    ...createSettingChangedEvent("domus_theme_mode_v1", "dark"),
    id: "evt-valid-seed",
    timestamp: 1_699_999_999_000,
  };
  const forgedSyncEvent: SyncEvent = {
    ...forgedEvent,
  };
  const replayed = replayAllEvents([validSeedEvent, forgedSyncEvent]);

  expect(replayed.quarantine).toEqual([]);
  expect(replayed.settings.values).toEqual({ domus_theme_mode_v1: "dark" });
  expect(
    Object.prototype.hasOwnProperty.call(replayed.settings.values, key),
  ).toBe(false);
}

const EXPLICIT_LOCAL_AND_SECRET_KEYS: readonly string[] = [
  // PIN / biometria
  "domus_security_settings_v1",
  // Consentimentos de telemetria / privacidade / IA
  "domus_analytics_settings_v1",
  "domus_personalized_ads_v1",
  "domus_external_lookups_v1",
  "AIDataPermissions",
  "domus_ai_settings_v1.dataPermissions",
  // Tour e introduções por tela
  "domus_welcome_done_v1",
  "domus_screen_intro_v1_*",
  "domus_screen_intro_v1_home",
  // Anúncio do dia
  "domus_daily_ad_last_v1",
  // Tokens e segredos
  "domus_gdrive_tokens_v1",
  "domus_ocr_cloud_vision_api_key",
  "domus_ai_key_*",
  "domus_ai_key_openai",
  "domus_auto_backup_device_key",
  "domus_nostr_group_code",
  "domus_strong_group_secret_v1",
  "domus_ai_tokens_v1",
  "domus_ai_tokens_monthly_v1",
  // Identificador do aparelho
  "domus_device_id",
  // Cursores e estado local de sync
  "domus_last_sync_ts",
  "domus_nostr_last_push_hash",
  "domus_group_push_hashes_v1",
  "domus_sync_group_tracking_v1",
  "@domus:handled_remote_markers",
  "domus_relay_cursor_v1",
  "domus_nostr_last_pull_ts",
  "domus_legacy_cutoff_warning_sent_*",
  "domus_legacy_cutoff_warning_sent_legacy-group",
  // Variações de borda e prototype pollution
  " domus_security_settings_v1 ",
  "__proto__",
  "constructor",
];

describe("Story 9.7 — barreira de sync para dados locais do aparelho e segredos", () => {
  it("ALLOWED_SETTING_KEYS coincide exatamente (ida e volta) com as entradas 'vira evento' de docs/inventario-dados.md", () => {
    const markdown = fs.readFileSync(INVENTORY_PATH, "utf8");
    const rows = parseInventoryRows(markdown);
    const inventorySyncKeys = rows
      .filter((row) => row.classification === "vira evento")
      .map((row) => row.key);

    const allowlistSet = new Set<string>(ALLOWED_SETTING_KEYS);
    const inventorySet = new Set<string>(inventorySyncKeys);

    expect(allowlistSet.size).toBe(ALLOWED_SETTING_KEYS.length);
    expect(inventorySet.size).toBe(inventorySyncKeys.length);

    const missingInInventory = ALLOWED_SETTING_KEYS.filter(
      (key) => !inventorySet.has(key),
    );
    const missingInAllowlist = inventorySyncKeys.filter(
      (key) => !allowlistSet.has(key),
    );

    expect(
      missingInInventory,
      "Chaves presentes em ALLOWED_SETTING_KEYS sem classificação 'vira evento' em docs/inventario-dados.md",
    ).toEqual([]);
    expect(
      missingInAllowlist,
      "Chaves 'vira evento' em docs/inventario-dados.md ausentes de ALLOWED_SETTING_KEYS",
    ).toEqual([]);
    expect(allowlistSet).toEqual(inventorySet);
  });

  it("ALLOWED_SETTING_KEYS é definida exclusivamente em packages/settings/src/types.ts", () => {
    const prodFiles: string[] = [];
    for (const dir of ["packages", "src", "app"]) {
      collectProductionTsFiles(path.join(ROOT, dir), prodFiles);
    }

    expect(prodFiles.length).toBeGreaterThan(0);

    const declarationRegex =
      /\b(?:export\s+)?(?:const|let|var)\s+ALLOWED_SETTING_KEYS\b/;
    const filesDefiningAllowlist: string[] = [];

    for (const filePath of prodFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      if (declarationRegex.test(content)) {
        filesDefiningAllowlist.push(
          path.relative(ROOT, filePath).replace(/\\/g, "/"),
        );
      }
    }

    expect(filesDefiningAllowlist).toEqual([CANONICAL_ALLOWLIST_FILE]);
  });

  it("recusa explicitamente todas as chaves locais do aparelho, consentimentos, tour, anúncio, tokens, deviceId, cursores e segredos", () => {
    for (const key of EXPLICIT_LOCAL_AND_SECRET_KEYS) {
      assertKeyRejectedEverywhere(key);
    }
  });

  it("recusa dinamicamente toda entrada de docs/inventario-dados.md fora da classe 'vira evento'", () => {
    const markdown = fs.readFileSync(INVENTORY_PATH, "utf8");
    const rows = parseInventoryRows(markdown);
    const nonSyncRows = rows.filter(
      (row) => row.classification !== "vira evento",
    );

    expect(nonSyncRows.length).toBeGreaterThan(20);

    for (const row of nonSyncRows) {
      for (const keyVariant of [row.key, ...row.aliases]) {
        assertKeyRejectedEverywhere(keyVariant);
        if (keyVariant.endsWith("*")) {
          assertKeyRejectedEverywhere(keyVariant.replace(/\*$/, "exemplo"));
        }
      }
    }
  });
});

describe("Story 10.2 — exclusividade de Grupo forte para domus_is_catholic_v1", () => {
  it("exclui domus_is_catholic_v1 do Grupo antigo e mantém apenas no Grupo forte", () => {
    const catholicEvent = createSettingChangedEvent(
      "domus_is_catholic_v1",
      true,
      "dev-a",
    ) as unknown as SyncEvent;

    const themeEvent = createSettingChangedEvent(
      "domus_theme_mode_v1",
      "dark",
      "dev-a",
    ) as unknown as SyncEvent;

    const events = [catholicEvent, themeEvent];

    const partitioned = partitionOldGroupEvents(events);
    expect(partitioned.allowed).toEqual([themeEvent]);
    expect(partitioned.excluded).toEqual([catholicEvent]);

    expect(selectOldGroupPushEvents(events, "dev-a")).toEqual([themeEvent]);
    expect(selectStrongGroupPushEvents(events, "dev-a")).toEqual(events);

    const oldGroupImport = selectEventsToImport(events, new Set(), {
      isStrongGroup: false,
    });
    expect(oldGroupImport.toAppend).toEqual([themeEvent]);
    expect(oldGroupImport.excluded).toBe(1);

    const strongGroupImport = selectEventsToImport(events, new Set(), {
      isStrongGroup: true,
    });
    expect(strongGroupImport.toAppend).toEqual(events);
    expect(strongGroupImport.excluded).toBe(0);
  });
});
