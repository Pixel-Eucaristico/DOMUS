import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  FIRST_PULL_TIMEOUT_MS,
  createBootEffectsGate,
  shouldRunBootEffects,
  evaluateDefaultCategoriesEffect,
  evaluateXpRecoveryEffect,
  evaluateSavingsGoalScheduleEffect,
  alreadyScheduledInPeriod,
  currentMonthPrefix,
  currentFortnight,
  currentWeek,
  monthlyContributionDate,
  savingsContributionPeriodKey,
  savingsContributionEventId,
} from "../bootEffectsGate";
import { createDefaultCategories } from "@packages/domain/src/categories";
import { createEvent } from "@packages/events/src/factory";
import {
  EVENT_TYPES,
  type AccountCreatedEvent,
  type TransactionCreatedEvent,
} from "@packages/events/src/types";
import type { SyncEvent } from "@packages/storage/src/eventStore";
import { replayAllEvents } from "@/src/context/replay";
import { createXpRecoveryEvent, mergeImported } from "@/src/context/localEventLog";
import { selectEventsToImport } from "@/src/modules/syncPayload";

describe("Story 7.2: Máquina de estados de createBootEffectsGate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("inicia não pronto (isReady() === false, getReason() === null)", () => {
    const gate = createBootEffectsGate();
    expect(gate.isReady()).toBe(false);
    expect(gate.getReason()).toBeNull();
    gate.dispose();
  });

  it("sem Grupo de sync ativo: markNoGroup() libera imediatamente com reason 'no_group'", () => {
    const onReady = vi.fn();
    const gate = createBootEffectsGate({ onReady });

    gate.markNoGroup();

    expect(gate.isReady()).toBe(true);
    expect(gate.getReason()).toBe("no_group");
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith("no_group");
  });

  it("com Grupo de sync ativo: aguarda até markPullCompleted() e libera com reason 'pull_completed'", () => {
    const onReady = vi.fn();
    const gate = createBootEffectsGate({ onReady });

    gate.startGroupWait();
    expect(gate.isReady()).toBe(false);
    expect(onReady).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2_500);
    expect(gate.isReady()).toBe(false);

    gate.markPullCompleted();
    expect(gate.isReady()).toBe(true);
    expect(gate.getReason()).toBe("pull_completed");
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith("pull_completed");

    // Avançar além de FIRST_PULL_TIMEOUT_MS não dispara timeout nem duplica onReady
    vi.advanceTimersByTime(FIRST_PULL_TIMEOUT_MS);
    expect(gate.getReason()).toBe("pull_completed");
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("primeiro pull falha ou expira em Grupo de sync: libera após FIRST_PULL_TIMEOUT_MS com reason 'timeout'", () => {
    const onReady = vi.fn();
    const gate = createBootEffectsGate({ onReady });

    gate.startGroupWait();
    gate.markPullFailed();

    // Antes de FIRST_PULL_TIMEOUT_MS permanece false
    vi.advanceTimersByTime(FIRST_PULL_TIMEOUT_MS - 1);
    expect(gate.isReady()).toBe(false);
    expect(onReady).not.toHaveBeenCalled();

    // Ao atingir FIRST_PULL_TIMEOUT_MS passa a true com reason "timeout"
    vi.advanceTimersByTime(1);
    expect(gate.isReady()).toBe(true);
    expect(gate.getReason()).toBe("timeout");
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith("timeout");
  });

  it("primeiro pull falha na 1ª tentativa mas recupera antes do timeout sem disparo duplo de onReady", () => {
    const onReady = vi.fn();
    const gate = createBootEffectsGate({ onReady });

    gate.startGroupWait();

    // Falha inicial em t = 1000ms
    vi.advanceTimersByTime(1_000);
    gate.markPullFailed();
    expect(gate.isReady()).toBe(false);

    // doSync recupera e conclui pull em t = 3000ms (< FIRST_PULL_TIMEOUT_MS)
    vi.advanceTimersByTime(2_000);
    gate.markPullCompleted();

    expect(gate.isReady()).toBe(true);
    expect(gate.getReason()).toBe("pull_completed");
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledWith("pull_completed");

    // Avançar além do timeout original não dispara onReady novamente
    vi.advanceTimersByTime(FIRST_PULL_TIMEOUT_MS);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(gate.getReason()).toBe("pull_completed");
  });

  it("notifica ouvintes registrados via subscribe e permite cancelar inscrição", () => {
    const gate = createBootEffectsGate();
    const listener = vi.fn();
    const unsubscribe = gate.subscribe(listener);

    expect(listener).not.toHaveBeenCalled();
    gate.markPullCompleted();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("pull_completed");

    unsubscribe();

    // Novo inscrito após liberação recebe o estado imediatamente
    const lateListener = vi.fn();
    gate.subscribe(lateListener);
    expect(lateListener).toHaveBeenCalledWith("pull_completed");
  });

  it("startGroupWait() reinicia o orçamento de FIRST_PULL_TIMEOUT_MS quando chamado novamente ao iniciar o pull", () => {
    const onReady = vi.fn();
    const gate = createBootEffectsGate({ onReady });

    // Chamado ao carregar o grupo enquanto loading do SQLite ainda estava true
    gate.startGroupWait();
    vi.advanceTimersByTime(4_000);
    expect(gate.isReady()).toBe(false);

    // Chamado novamente quando loading passa a false e pullAllGroups() realmente começa
    gate.startGroupWait();
    vi.advanceTimersByTime(FIRST_PULL_TIMEOUT_MS - 1);
    expect(gate.isReady()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(gate.isReady()).toBe(true);
    expect(gate.getReason()).toBe("timeout");
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

describe("Story 7.2: shouldRunBootEffects e modo demo", () => {
  it("retorna false quando loading === true ou initialSyncReady === false", () => {
    expect(shouldRunBootEffects({ loading: true, initialSyncReady: false })).toBe(false);
    expect(shouldRunBootEffects({ loading: true, initialSyncReady: true })).toBe(false);
    expect(shouldRunBootEffects({ loading: false, initialSyncReady: false })).toBe(false);
  });

  it("retorna false quando isDemoActive === true mesmo com loading === false e initialSyncReady === true", () => {
    expect(
      shouldRunBootEffects({
        loading: false,
        initialSyncReady: true,
        isDemoActive: true,
      }),
    ).toBe(false);
  });

  it("retorna true quando loading === false, initialSyncReady === true e isDemoActive === false", () => {
    expect(
      shouldRunBootEffects({
        loading: false,
        initialSyncReady: true,
        isDemoActive: false,
      }),
    ).toBe(true);
  });
});

describe("Story 7.2: Cenário 1 — Aparelho com Grupo de sync ativo aguarda o 1º pull e evita duplicatas nos 3 efeitos", () => {
  it("não emite categorias padrão, recuperação de XP nem aporte pendente antes do pull nem após importar log remoto que já os contém", () => {
    const now = new Date(2026, 10, 12, 10, 0, 0); // 2026-11-12
    const deviceA = "dev-aparelho-a";
    const deviceB = "dev-aparelho-b";

    // Aparelho A já criou categorias padrão, conta poupança, aporte do mês e recuperação de XP
    const remoteCategoryEvents: SyncEvent[] = createDefaultCategories().map((evt) => ({
      id: evt.id,
      type: evt.type as string,
      payload: evt.payload,
      timestamp: 1_700_000_001_000,
      deviceId: deviceA,
      signature: "",
    }));

    const savingsAccountEvt = createEvent<AccountCreatedEvent>(
      EVENT_TYPES.ACCOUNT_CREATED,
      {
        id: "acc-savings-1",
        name: "Reserva de Emergência",
        type: "savings",
        balance: 100000,
        savingsContributionAmount: 25000,
        contributionRecurrence: "monthly",
        contributionDay: 5,
      },
      deviceA,
    );

    const savingsContributionEvt = createEvent<TransactionCreatedEvent>(
      EVENT_TYPES.TRANSACTION_CREATED,
      {
        id: "tx-savings-2026-11",
        accountId: "acc-savings-1",
        type: "income",
        amount: 25000,
        categoryId: "outros",
        date: "2026-11-05",
        description: "Aporte poupança: Reserva de Emergência (mensal)",
        status: "pending",
      },
      deviceA,
    );

    const remoteXpRecoveryEvt = createXpRecoveryEvent(30, deviceA);

    const remoteBundle: SyncEvent[] = [
      ...remoteCategoryEvents,
      {
        id: savingsAccountEvt.id,
        type: savingsAccountEvt.type as string,
        payload: savingsAccountEvt.payload,
        timestamp: 1_700_000_002_000,
        deviceId: deviceA,
        signature: "",
      },
      {
        id: savingsContributionEvt.id,
        type: savingsContributionEvt.type as string,
        payload: savingsContributionEvt.payload,
        timestamp: 1_700_000_003_000,
        deviceId: deviceA,
        signature: "",
      },
      remoteXpRecoveryEvt,
    ];

    // 1. Aparelho B inicia com banco local vazio (ou parcial) e grupo de sync ativo
    const gate = createBootEffectsGate();
    gate.startGroupWait();
    expect(gate.isReady()).toBe(false);

    let localLogB: SyncEvent[] = [];
    let stateB = replayAllEvents(localLogB);

    // Antes do primeiro pull concluir: nenhum dos 3 efeitos deve emitir eventos
    expect(
      evaluateDefaultCategoriesEffect({
        loading: false,
        initialSyncReady: gate.isReady(),
        deviceId: deviceB,
        categories: stateB.domain.categories,
        allEvents: localLogB,
      }),
    ).toHaveLength(0);

    expect(
      evaluateXpRecoveryEffect({
        loading: false,
        initialSyncReady: gate.isReady(),
        deviceId: deviceB,
        allEvents: localLogB,
        transactions: stateB.domain.transactions,
        totalXp: stateB.gamification.totalXp,
      }),
    ).toHaveLength(0);

    expect(
      evaluateSavingsGoalScheduleEffect({
        loading: false,
        initialSyncReady: gate.isReady(),
        deviceId: deviceB,
        accounts: stateB.domain.accounts,
        transactions: stateB.domain.transactions,
        now,
      }),
    ).toHaveLength(0);

    // 2. Primeiro pull do grupo importa o log remoto para o Aparelho B e marca conclusão
    const { toAppend } = selectEventsToImport(remoteBundle, new Set(), undefined, {
      isStrongGroup: true,
    });
    localLogB = mergeImported(localLogB, toAppend, deviceB);
    stateB = replayAllEvents(localLogB);
    gate.markPullCompleted();

    expect(gate.isReady()).toBe(true);
    expect(gate.getReason()).toBe("pull_completed");

    // 3. Após o primeiro pull, os 3 avaliadores rodam sobre o estado atualizado e emitem 0 duplicatas
    const emittedCategories = evaluateDefaultCategoriesEffect({
      loading: false,
      initialSyncReady: gate.isReady(),
      deviceId: deviceB,
      categories: stateB.domain.categories,
      allEvents: localLogB,
      hasCategoryEvents: localLogB.some((e) => e.type === EVENT_TYPES.CATEGORY_CREATED),
    });
    expect(emittedCategories).toHaveLength(0);

    const emittedXpRecovery = evaluateXpRecoveryEffect({
      loading: false,
      initialSyncReady: gate.isReady(),
      deviceId: deviceB,
      allEvents: localLogB,
      transactions: stateB.domain.transactions,
      totalXp: stateB.gamification.totalXp,
    });
    expect(emittedXpRecovery).toHaveLength(0);

    const emittedSavings = evaluateSavingsGoalScheduleEffect({
      loading: false,
      initialSyncReady: gate.isReady(),
      deviceId: deviceB,
      accounts: stateB.domain.accounts,
      transactions: stateB.domain.transactions,
      now,
    });
    expect(emittedSavings).toHaveLength(0);
  });
});

describe("Story 7.2: Cenário 2 — Aparelho sem Grupo de sync executa os 3 efeitos imediatamente", () => {
  it("libera imediatamente com markNoGroup() e executa categorias padrão, recuperação de XP e aporte pendente sem aguardar timeout", () => {
    const now = new Date(2026, 10, 12, 10, 0, 0); // dia 12 >= contributionDay 5
    const deviceId = "dev-solo";

    const gate = createBootEffectsGate();
    gate.markNoGroup();

    expect(gate.isReady()).toBe(true);
    expect(gate.getReason()).toBe("no_group");

    // 1. Categorias padrão em aparelho recém-instalado sem categorias
    const emittedCategories = evaluateDefaultCategoriesEffect({
      loading: false,
      initialSyncReady: gate.isReady(),
      deviceId,
      categories: {},
      allEvents: [],
      hasCategoryEvents: false,
    });
    expect(emittedCategories.length).toBeGreaterThan(0);
    expect(emittedCategories.every((e) => e.type === EVENT_TYPES.CATEGORY_CREATED)).toBe(true);

    // 2. Recuperação de XP quando há transações locais e XP zerado
    const txEvt = createEvent<TransactionCreatedEvent>(
      EVENT_TYPES.TRANSACTION_CREATED,
      {
        id: "tx-local-1",
        accountId: "acc-1",
        type: "expense",
        amount: 5000,
        categoryId: "alimentacao",
        date: "2026-11-10",
        description: "Mercado",
        status: "confirmed",
      },
      deviceId,
    );
    const localLog: SyncEvent[] = [
      {
        id: txEvt.id,
        type: txEvt.type as string,
        payload: txEvt.payload,
        timestamp: txEvt.timestamp,
        deviceId,
        signature: "",
      },
    ];
    const replayed = replayAllEvents(localLog);

    const emittedXpRecovery = evaluateXpRecoveryEffect({
      loading: false,
      initialSyncReady: gate.isReady(),
      deviceId,
      allEvents: localLog,
      transactions: replayed.domain.transactions,
      totalXp: replayed.gamification.totalXp,
    });
    expect(emittedXpRecovery).toHaveLength(1);
    expect(emittedXpRecovery[0]?.type).toBe("XP_GAINED");

    // 3. Aporte pendente quando há conta poupança configurada sem aporte no período
    const emittedSavings = evaluateSavingsGoalScheduleEffect({
      loading: false,
      initialSyncReady: gate.isReady(),
      deviceId,
      accounts: {
        "acc-sav": {
          id: "acc-sav",
          name: "Caixinha",
          type: "savings",
          balance: 0,
          savingsContributionAmount: 15000,
          contributionRecurrence: "monthly",
          contributionDay: 5,
        },
      },
      transactions: {},
      now,
    });
    expect(emittedSavings).toHaveLength(1);
    expect(emittedSavings[0]?.payload.accountId).toBe("acc-sav");
    expect(emittedSavings[0]?.payload.status).toBe("pending");
    expect(emittedSavings[0]?.payload.date).toBe("2026-11-05");
  });
});

describe("Story 7.2: Cenário 3 — Falha ou timeout do primeiro pull libera após FIRST_PULL_TIMEOUT_MS sem travar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aguarda FIRST_PULL_TIMEOUT_MS quando o pull falha e então executa os efeitos normalmente", () => {
    const now = new Date(2026, 10, 12, 10, 0, 0);
    const deviceId = "dev-offline";
    const gate = createBootEffectsGate();

    gate.startGroupWait();
    gate.markPullFailed();

    // Durante a espera de rede, loading local já é false (UI livre), mas initialSyncReady é false
    expect(gate.isReady()).toBe(false);
    expect(
      evaluateDefaultCategoriesEffect({
        loading: false,
        initialSyncReady: gate.isReady(),
        deviceId,
        categories: {},
      }),
    ).toHaveLength(0);

    // Avança o relógio até FIRST_PULL_TIMEOUT_MS
    vi.advanceTimersByTime(FIRST_PULL_TIMEOUT_MS);
    expect(gate.isReady()).toBe(true);
    expect(gate.getReason()).toBe("timeout");

    // Com a barreira liberada por timeout, os efeitos executam normalmente
    const categoriesAfterTimeout = evaluateDefaultCategoriesEffect({
      loading: false,
      initialSyncReady: gate.isReady(),
      deviceId,
      categories: {},
    });
    expect(categoriesAfterTimeout.length).toBeGreaterThan(0);

    const savingsAfterTimeout = evaluateSavingsGoalScheduleEffect({
      loading: false,
      initialSyncReady: gate.isReady(),
      deviceId,
      accounts: {
        "acc-sav": {
          id: "acc-sav",
          name: "Poupança Offline",
          type: "savings",
          balance: 0,
          savingsContributionAmount: 10000,
          contributionRecurrence: "monthly",
          contributionDay: 1,
        },
      },
      transactions: {},
      now,
    });
    expect(savingsAfterTimeout).toHaveLength(1);
  });
});

describe("Story 7.2: Helpers de período do agendador de aportes", () => {
  it("calcula prefixo mensal, quinzena, semana e data de contribuição mensal corretamente", () => {
    const firstHalf = new Date(2026, 1, 10, 12, 0, 0); // 2026-02-10 (terça-feira)
    expect(currentMonthPrefix(firstHalf)).toBe("2026-02");
    expect(currentFortnight(firstHalf)).toEqual(["2026-02-01", "2026-02-15"]);
    expect(currentWeek(firstHalf)).toEqual(["2026-02-09", "2026-02-15"]);
    // Dia 31 em fevereiro ajusta para o último dia do mês (28)
    expect(monthlyContributionDate(31, firstHalf)).toBe("2026-02-28");

    const secondHalf = new Date(2026, 1, 20, 12, 0, 0); // 2026-02-20
    expect(currentFortnight(secondHalf)).toEqual(["2026-02-16", "2026-02-28"]);
  });

  it("alreadyScheduledInPeriod detecta aportes pendentes ou confirmados em recorrências mensal, quinzenal e semanal", () => {
    const now = new Date(2026, 10, 12, 12, 0, 0); // 2026-11-12
    const descPrefix = "Aporte poupança:";

    const txs = [
      {
        id: "tx-1",
        accountId: "acc-1",
        type: "income" as const,
        amount: 10000,
        categoryId: "outros",
        date: "2026-11-05",
        description: "Aporte poupança: Meta (mensal)",
        status: "confirmed" as const,
      },
    ];

    expect(alreadyScheduledInPeriod(txs, "acc-1", "monthly", descPrefix, now)).toBe(true);
    expect(alreadyScheduledInPeriod(txs, "acc-1", "biweekly", descPrefix, now)).toBe(true);
    expect(alreadyScheduledInPeriod(txs, "acc-2", "monthly", descPrefix, now)).toBe(false);
  });
});

describe("Story 7.2: Verificação de integração nos módulos e hooks", () => {
  const eventStoreSource = readFileSync(
    path.resolve(__dirname, "../../hooks/useEventStore.ts"),
    "utf8",
  );
  const appStateSource = readFileSync(
    path.resolve(__dirname, "../../context/AppStateProvider.tsx"),
    "utf8",
  );
  const gamEffectsSource = readFileSync(
    path.resolve(__dirname, "../../hooks/useGamificationEffects.ts"),
    "utf8",
  );
  const savingsSchedulerSource = readFileSync(
    path.resolve(__dirname, "../../hooks/useSavingsGoalScheduler.ts"),
    "utf8",
  );
  const syncProviderSource = readFileSync(
    path.resolve(__dirname, "../../context/SyncProvider.tsx"),
    "utf8",
  );
  const syncEngineSource = readFileSync(
    path.resolve(__dirname, "../../context/useSyncEngine.ts"),
    "utf8",
  );

  it("useEventStore atualiza allEventsRef.current sincronicamente dentro de importEvents", () => {
    expect(eventStoreSource).toContain(
      "allEventsRef.current = mergeImported(allEventsRef.current, newEvents, deviceId);",
    );
  });

  it("AppStateProvider instancia createBootEffectsGate, expõe initialSyncReady e mantém loading atrelado a eventStore.loading", () => {
    expect(appStateSource).toContain("createBootEffectsGate");
    expect(appStateSource).toContain("evaluateXpRecoveryEffect");
    expect(appStateSource).toContain("initialSyncReady");
    expect(appStateSource).toContain("bootEffectsGate");
    expect(appStateSource).toContain("loading: eventStore.loading");
  });

  it("useGamificationEffects e useSavingsGoalScheduler condicionam efeitos de boot a initialSyncReady", () => {
    expect(gamEffectsSource).toContain("evaluateDefaultCategoriesEffect");
    expect(gamEffectsSource).toContain("initialSyncReady");
    expect(savingsSchedulerSource).toContain("evaluateSavingsGoalScheduleEffect");
    expect(savingsSchedulerSource).toContain(
      "if (loading || !initialSyncReady || isDemoActive || hasRunRef.current) return;",
    );
  });

  it("SyncProvider repassa bootEffectsGate para useSyncEngine e useSyncEngine executa pullAllGroups antes de pushAllGroups no sync inicial", () => {
    expect(syncProviderSource).toContain("bootEffectsGate");
    expect(syncEngineSource).toContain("bootEffectsGate?.startGroupWait()");
    expect(syncEngineSource).toContain("bootEffectsGate?.markNoGroup()");
    expect(syncEngineSource).toContain("bootEffectsGate?.markPullCompleted()");
    expect(syncEngineSource).toContain("bootEffectsGate?.markPullFailed()");

    // No sync inicial (!initialSyncDoneRef.current), pullAllGroups() vem antes de pushAllGroups(true)
    const initialSyncBlockMatch = syncEngineSource.match(
      /if\s*\(!initialSyncDoneRef\.current\)\s*\{[\s\S]*?\.catch\(/,
    );
    expect(initialSyncBlockMatch).not.toBeNull();
    const block = initialSyncBlockMatch![0];
    const pullIdx = block.indexOf("pullAllGroups()");
    const pushIdx = block.indexOf("pushAllGroups(true)");
    expect(pullIdx).toBeGreaterThan(0);
    expect(pushIdx).toBeGreaterThan(pullIdx);
  });
});

describe("Story 7.3: aporte pendente com id determinístico por período", () => {
  const acc = (over: Record<string, unknown> = {}) => ({
    id: "acc-1",
    name: "Meta",
    type: "savings" as const,
    balance: 1000,
    savingsContributionAmount: 5000,
    contributionRecurrence: "monthly" as const,
    contributionDay: 1,
    ...over,
  });
  const toSync = (e: TransactionCreatedEvent, deviceId: string): SyncEvent => ({
    id: e.id,
    type: e.type as string,
    payload: e.payload,
    timestamp: e.timestamp,
    deviceId,
    signature: "",
  });
  const run = (accounts: unknown[], transactions: unknown[], deviceId: string, now: Date) =>
    evaluateSavingsGoalScheduleEffect({
      loading: false,
      initialSyncReady: true,
      deviceId,
      accounts: accounts as never,
      transactions: transactions as never,
      now,
    });

  it("gera chaves e ids distintos por recorrência e período", () => {
    const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12);
    expect(savingsContributionPeriodKey("monthly", d(2026, 11, 12))).toBe("2026-11");
    expect(savingsContributionPeriodKey("biweekly", d(2026, 11, 15))).toBe("2026-11-Q1");
    expect(savingsContributionPeriodKey("biweekly", d(2026, 11, 16))).toBe("2026-11-Q2");
    expect(savingsContributionPeriodKey("weekly", d(2026, 11, 12))).toBe("2026-11-09");
    expect(savingsContributionPeriodKey("weekly", d(2026, 11, 15))).toBe("2026-11-09");
    expect(savingsContributionPeriodKey("weekly", d(2026, 11, 16))).toBe("2026-11-16");
    const ids = [
      savingsContributionEventId("a", "monthly", d(2026, 10, 5)),
      savingsContributionEventId("a", "monthly", d(2026, 11, 5)),
      savingsContributionEventId("a", "biweekly", d(2026, 11, 5)),
      savingsContributionEventId("a", "biweekly", d(2026, 11, 20)),
      savingsContributionEventId("a", "weekly", d(2026, 11, 5)),
      savingsContributionEventId("a", "weekly", d(2026, 11, 12)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mantém ':' do accountId sem alteração", () => {
    expect(savingsContributionEventId("a:b", "monthly", new Date(2026, 10, 12))).toBe(
      "savings:a:b:2026-11",
    );
  });

  it("dois aparelhos geram o mesmo id e o merge resulta em uma só transação; efetivar soma uma vez", () => {
    const now = new Date(2026, 10, 12, 10);
    const accEvt = createEvent<AccountCreatedEvent>(
      EVENT_TYPES.ACCOUNT_CREATED,
      acc() as never,
      "dev-a",
    );
    const accSync: SyncEvent = {
      id: accEvt.id,
      type: accEvt.type as string,
      payload: accEvt.payload,
      timestamp: 1_700_000_000_000,
      deviceId: "dev-a",
      signature: "",
    };
    const base = [accSync];
    const a = run([acc()], [], "dev-a", now);
    const b = run([acc()], [], "dev-b", now);
    expect(a).toHaveLength(1);
    expect(a[0].id).toBe("savings:acc-1:2026-11");
    expect(a[0].payload.id).toBe(a[0].id);
    expect(b[0].id).toBe(a[0].id);

    const logB = mergeImported(
      mergeImported(base, [toSync(b[0], "dev-b")], "dev-b"),
      [toSync(a[0], "dev-a")],
      "dev-b",
    );
    expect(logB.filter((e) => e.type === EVENT_TYPES.TRANSACTION_CREATED)).toHaveLength(1);
    const pending = replayAllEvents(logB);
    expect(Object.keys(pending.domain.transactions)).toEqual([a[0].id]);

    const confirm: SyncEvent = {
      id: "upd-1",
      type: EVENT_TYPES.TRANSACTION_UPDATED as string,
      payload: { id: a[0].id, status: "confirmed" },
      timestamp: 1_800_000_000_000,
      deviceId: "dev-b",
      signature: "",
    };
    const done = replayAllEvents([...logB, confirm]);
    expect(Object.keys(done.domain.transactions)).toHaveLength(1);
    expect(done.domain.transactions[a[0].id].status).toBe("confirmed");
    const before = pending.domain.accounts["acc-1"].balance;
    expect(done.domain.accounts["acc-1"].balance).toBe(before + 5000);
  });

  it("aporte excluído no período não ressuscita com o mesmo id vindo de outro aparelho", () => {
    const now = new Date(2026, 10, 12, 10);
    const accSync: SyncEvent = {
      id: "acc-evt",
      type: EVENT_TYPES.ACCOUNT_CREATED as string,
      payload: acc() as never,
      timestamp: 1_700_000_000_000,
      deviceId: "dev-a",
      signature: "",
    };
    const a = run([acc()], [], "dev-a", now);
    const del: SyncEvent = {
      id: "del-1",
      type: EVENT_TYPES.TRANSACTION_DELETED as string,
      payload: { id: a[0].id },
      timestamp: 1_800_000_000_000,
      deviceId: "dev-a",
      signature: "",
    };
    const logA = [accSync, toSync(a[0], "dev-a"), del];
    const b = run([acc()], [], "dev-b", now);
    const merged = mergeImported(logA, [toSync(b[0], "dev-b")], "dev-a");
    const state = replayAllEvents(merged);
    expect(Object.keys(state.domain.transactions)).toHaveLength(0);
  });

  it("aporte antigo com id aleatório no período não é recriado", () => {
    const now = new Date(2026, 10, 12, 10);
    const old = {
      id: "random-old-id",
      accountId: "acc-1",
      type: "income",
      amount: 5000,
      categoryId: "outros",
      date: "2026-11-01",
      description: "Aporte poupança: Meta (mensal)",
      status: "pending",
    };
    expect(run([acc()], [old], "dev-a", now)).toHaveLength(0);
  });
});
