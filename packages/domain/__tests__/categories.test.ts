import { describe, it, expect } from "vitest";
import {
  DEFAULT_CATEGORY_EVENT_ID_PREFIX,
  CUSTOM_CATEGORY_EVENT_ID_PREFIX,
  categorySlug,
  createCategoryByNameEvent,
  createDefaultCategories,
  defaultCategoryEventId,
} from "../src/categories";
import { domainReducer } from "../src/reducer";
import { createInitialState } from "../src/state";
import { EVENT_TYPES, type CategoryCreatedEvent } from "../../events/src/types";
import type { SyncEvent } from "../../storage/src/eventStore";
import { mergeImported } from "@/src/context/localEventLog";
import { replayAllEvents } from "@/src/context/replay";
import { checkNewAchievements } from "@packages/gamification/src/achievements";
import { createInitialGamificationState } from "@packages/gamification/src/reducer";
import { calculate503020 } from "../src/transactions";

function toSyncEvent(evt: CategoryCreatedEvent, deviceId: string, timestamp: number): SyncEvent {
  return {
    id: evt.id,
    type: evt.type as string,
    payload: evt.payload,
    timestamp,
    deviceId,
    signature: "",
  };
}

describe("Story 7.6: categorias sem duplicar entre aparelhos", () => {
  it("gera ids determinísticos cats:default:{categoryId} e mescla dois aparelhos em 13 categorias únicas", () => {
    const devACats = createDefaultCategories();
    const devBCats = createDefaultCategories();

    expect(devACats).toHaveLength(13);
    for (const evt of devACats) {
      expect(evt.id).toBe(defaultCategoryEventId(evt.payload.id));
      expect(evt.id.startsWith(DEFAULT_CATEGORY_EVENT_ID_PREFIX)).toBe(true);
    }

    const logA = devACats.map((e, i) => toSyncEvent(e, "dev-a", 1_700_000_000_000 + i));
    const logB = devBCats.map((e, i) => toSyncEvent(e, "dev-b", 1_700_000_010_000 + i));

    const merged = mergeImported(logA, logB, "dev-a");
    expect(merged.filter((e) => e.type === EVENT_TYPES.CATEGORY_CREATED)).toHaveLength(13);

    const replayed = replayAllEvents(merged);
    expect(Object.keys(replayed.domain.categories)).toHaveLength(13);
  });

  it("categoria padrão (cats:default:*) não sobrescreve edição feita por outro aparelho", () => {
    const editedByOtherDevice: CategoryCreatedEvent = {
      id: "edit-cat-alimentacao-1",
      type: EVENT_TYPES.CATEGORY_CREATED,
      payload: {
        id: "alimentacao",
        name: "Alimentação Casa",
        group: "wants",
      },
      timestamp: 1_700_000_000_000,
      deviceId: "dev-a",
      signature: "",
    };

    const lateDefault = createDefaultCategories().find((c) => c.payload.id === "alimentacao")!;

    let state = createInitialState();
    state = domainReducer(state, editedByOtherDevice);
    state = domainReducer(state, { ...lateDefault, timestamp: 1_700_000_050_000 });

    expect(state.categories["alimentacao"]).toEqual({
      id: "alimentacao",
      name: "Alimentação Casa",
      group: "wants",
    });
  });

  it("edição não-default posterior atualiza normalmente uma categoria padrão já aplicada", () => {
    const defaultEvt = createDefaultCategories().find((c) => c.payload.id === "alimentacao")!;
    const laterEdit: CategoryCreatedEvent = {
      id: "edit-cat-alimentacao-2",
      type: EVENT_TYPES.CATEGORY_CREATED,
      payload: {
        id: "alimentacao",
        name: "Mercado e Feira",
        group: "needs",
      },
      timestamp: defaultEvt.timestamp + 1000,
      deviceId: "dev-b",
      signature: "",
    };

    let state = createInitialState();
    state = domainReducer(state, defaultEvt);
    state = domainReducer(state, laterEdit);

    expect(state.categories["alimentacao"]).toEqual({
      id: "alimentacao",
      name: "Mercado e Feira",
      group: "needs",
    });
  });

  it("criação sob demanda gera slug estável e colapsa 'Restaurantes' de dois aparelhos em uma única categoria", () => {
    const evtA = createCategoryByNameEvent({ name: "Restaurantes", group: "wants" }, "dev-a");
    const evtB = createCategoryByNameEvent({ name: "Restaurantes", group: "wants" }, "dev-b");

    expect(evtA.id).toBe(`${CUSTOM_CATEGORY_EVENT_ID_PREFIX}restaurantes`);
    expect(evtA.payload.id).toBe("restaurantes");
    expect(evtB.id).toBe(evtA.id);
    expect(evtB.payload.id).toBe(evtA.payload.id);

    const merged = mergeImported(
      [toSyncEvent(evtA, "dev-a", 1_700_000_000_000)],
      [toSyncEvent(evtB, "dev-b", 1_700_000_001_000)],
      "dev-a",
    );

    expect(merged.filter((e) => e.type === EVENT_TYPES.CATEGORY_CREATED)).toHaveLength(1);
    const replayed = replayAllEvents(merged);
    const restaurantes = Object.values(replayed.domain.categories).filter(
      (c) => c.name === "Restaurantes",
    );
    expect(restaurantes).toHaveLength(1);
    expect(restaurantes[0]!.id).toBe("restaurantes");
  });

  it("conquista de dízimo (first_dizimo) reconhece a categoria criada pelo fluxo do formulário", () => {
    const formCatEvt = createCategoryByNameEvent(
      { id: "dizimo", name: "Dízimo / Oferta", group: "wants" },
      "dev-a",
    );
    expect(formCatEvt.id).toBe(`${CUSTOM_CATEGORY_EVENT_ID_PREFIX}dizimo`);
    expect(formCatEvt.payload.id).toBe("dizimo");

    const txSync: SyncEvent = {
      id: "tx-dizimo-1",
      type: EVENT_TYPES.TRANSACTION_CREATED,
      payload: {
        id: "tx-dizimo-1",
        accountId: "acc-1",
        type: "expense",
        amount: 10000,
        categoryId: formCatEvt.payload.id,
        date: "2026-11-15",
        description: "Dízimo",
        status: "confirmed",
      },
      timestamp: 1_700_000_001_000,
      deviceId: "dev-a",
      signature: "",
    };

    const replayed = replayAllEvents([
      toSyncEvent(formCatEvt, "dev-a", 1_700_000_000_000),
      txSync,
    ]);
    const budget = calculate503020(
      Object.values(replayed.domain.transactions),
      replayed.domain.categories,
      10,
      2026,
    );
    const unlocked = checkNewAchievements(
      replayed.domain,
      createInitialGamificationState(),
      budget,
      new Set(),
    );
    expect(unlocked.some((a) => a.id === "first_dizimo")).toBe(true);
  });

  it("categorySlug normaliza acentos, pontuação e usa fallback 'categoria' para entrada vazia", () => {
    expect(categorySlug("Café & Pão!")).toBe("cafe-pao");
    expect(categorySlug("  Dízimo  ")).toBe("dizimo");
    expect(categorySlug("!!!")).toBe("categoria");
    expect(categorySlug("")).toBe("categoria");
  });

  it("categoria customizada tardia (cats:custom:*) de outro aparelho não sobrescreve edição local", () => {
    const devAEvent = createCategoryByNameEvent({ name: "Restaurantes", group: "wants" });
    const devBEvent = createCategoryByNameEvent({ name: "Restaurantes", group: "wants" });
    const editByA: SyncEvent = {
      id: "edit-rest-1",
      type: EVENT_TYPES.CATEGORY_CREATED,
      payload: { id: "restaurantes", name: "Bares e Restaurantes", group: "wants" },
      timestamp: 1_700_000_000_200,
      deviceId: "dev-a",
      signature: "",
    };

    const merged = mergeImported(
      [toSyncEvent(devAEvent, "dev-a", 1_700_000_000_100), editByA],
      [toSyncEvent(devBEvent, "dev-b", 1_700_000_000_500)],
      "dev-a",
    );
    const replayed = replayAllEvents(merged);
    expect(replayed.domain.categories["restaurantes"]?.name).toBe("Bares e Restaurantes");
  });
});
