import { describe, expect, it, vi } from "vitest";
import {
  createLockScreenPinVerifier,
  createSecuritySetupRunner,
  formatPinFailureMessage,
} from "../application/pinVerificationFlow";
import {
  DEFAULT_SECURITY_SETTINGS,
  type UserSecuritySettings,
} from "../domain/UserSecuritySettings";
import type { LocalAction } from "../application/securitySetupReducer";

function makeSettings(overrides: Partial<UserSecuritySettings> = {}): UserSecuritySettings {
  return {
    ...DEFAULT_SECURITY_SETTINGS,
    enabled: true,
    method: "pin",
    pinHash: "pbkdf2-sha256$30000$" + "a".repeat(64),
    pinSalt: "b".repeat(32),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("formatPinFailureMessage", () => {
  it("formata bloqueio com segundos restantes, PIN não configurado e tentativas restantes", () => {
    const s = makeSettings();
    expect(
      formatPinFailureMessage({ success: false, reason: "locked" }, s, () => 12_300, "Bloqueado."),
    ).toBe("Bloqueado. Aguarde 13s.");
    expect(
      formatPinFailureMessage({ success: false, reason: "not_configured" }, s, () => 0),
    ).toBe("PIN não configurado.");
    expect(
      formatPinFailureMessage({ success: false, reason: "wrong_pin", remainingAttempts: 1 }, s, () => 0),
    ).toBe("PIN incorreto. 1 tentativa restante.");
    expect(
      formatPinFailureMessage({ success: false, reason: "wrong_pin", remainingAttempts: 0 }, s, () => 0),
    ).toBe("Conta bloqueada por 30 segundos.");
  });
});

describe("createLockScreenPinVerifier (LockScreen D15)", () => {
  it("ativa verifying antes do hash, bloqueia duplo toque síncrono e desbloqueia no sucesso", async () => {
    const gate = deferred<{ success: true }>();
    const order: string[] = [];
    const verifyPin = vi.fn(() => {
      order.push("verifyPin");
      return gate.promise;
    });
    const onUnlock = vi.fn(() => order.push("unlock"));
    const setPinVerifying = vi.fn((v: boolean) => order.push(`verifying:${v}`));

    const verifier = createLockScreenPinVerifier({
      verifyPin,
      loadSettings: vi.fn(async () => makeSettings()),
      getRemainingLockMs: () => 0,
      setSettings: vi.fn(),
      setPinError: vi.fn(),
      setPinVerifying,
      onUnlock,
      onSuccessFeedback: vi.fn(),
      onErrorFeedback: vi.fn(),
      yieldBeforeHash: async () => {
        order.push("yield");
      },
    });

    const settings = makeSettings();
    const p1 = verifier.verify("1234", settings);
    const p2 = verifier.verify("1234", settings); // duplo toque síncrono bloqueado

    await Promise.resolve();
    expect(verifyPin).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["verifying:true", "yield", "verifyPin"]);

    gate.resolve({ success: true });
    await Promise.all([p1, p2]);

    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["verifying:true", "yield", "verifyPin", "unlock", "verifying:false"]);
  });

  it("mantém verifying=true até loadSettings e setPinError concluírem após PIN incorreto", async () => {
    const order: string[] = [];
    const loadGate = deferred<UserSecuritySettings>();

    const verifier = createLockScreenPinVerifier({
      verifyPin: vi.fn(async () => ({ success: false as const, reason: "wrong_pin" as const, remainingAttempts: 2 })),
      loadSettings: vi.fn(() => {
        order.push("loadSettings");
        return loadGate.promise;
      }),
      getRemainingLockMs: () => 0,
      setSettings: vi.fn(() => order.push("setSettings")),
      setPinError: vi.fn((msg) => {
        if (msg) order.push(`setError:${msg}`);
      }),
      setPinVerifying: vi.fn((v) => order.push(`verifying:${v}`)),
      onUnlock: vi.fn(),
      onSuccessFeedback: vi.fn(),
      onErrorFeedback: vi.fn(),
      yieldBeforeHash: async () => {},
    });

    const pending = verifier.verify("9999", makeSettings());
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toContain("loadSettings");
    expect(order).not.toContain("verifying:false");

    loadGate.resolve(makeSettings({ failedAttempts: 1 }));
    await pending;

    expect(order.indexOf("setSettings")).toBeLessThan(order.indexOf("verifying:false"));
    expect(order.indexOf("setError:PIN incorreto. 2 tentativas restantes.")).toBeLessThan(
      order.indexOf("verifying:false"),
    );
  });

  it("captura rejeição em verifyPin, exibe erro amigável e limpa verifying", async () => {
    const setPinError = vi.fn();
    const setPinVerifying = vi.fn();
    const verifier = createLockScreenPinVerifier({
      verifyPin: vi.fn(async () => {
        throw new Error("SecureStore failure");
      }),
      loadSettings: vi.fn(async () => makeSettings()),
      getRemainingLockMs: () => 0,
      setSettings: vi.fn(),
      setPinError,
      setPinVerifying,
      onUnlock: vi.fn(),
      onSuccessFeedback: vi.fn(),
      onErrorFeedback: vi.fn(),
      yieldBeforeHash: async () => {},
    });

    await verifier.verify("1234", makeSettings());
    expect(setPinError).toHaveBeenLastCalledWith("Erro ao verificar PIN. Tente novamente.");
    expect(setPinVerifying).toHaveBeenLastCalledWith(false);
  });
});

describe("createSecuritySetupRunner (useSecuritySetup D15)", () => {
  it("verifyToDisable despacha SET_SAVING(true), bloqueia duplo toque e aborta disableLock se cancel() ocorrer em voo", async () => {
    const gate = deferred<{ success: true }>();
    const actions: LocalAction[] = [];
    const disableLock = vi.fn(async () => {});
    const verifyPin = vi.fn(() => gate.promise);

    const runner = createSecuritySetupRunner({
      verifyPin,
      setupPin: vi.fn(async () => makeSettings()),
      loadSettings: vi.fn(async () => makeSettings()),
      disableLock,
      getRemainingLockMs: () => 0,
      setSettings: vi.fn(),
      dispatch: (a) => actions.push(a),
      onSuccessFeedback: vi.fn(),
      onErrorFeedback: vi.fn(),
      yieldBeforeHash: async () => {},
    });

    const settings = makeSettings();
    const p1 = runner.verifyToDisable("1234", settings);
    const p2 = runner.verifyToDisable("1234", settings);
    await Promise.resolve();

    expect(actions).toEqual([{ type: "SET_SAVING", value: true }]);
    expect(verifyPin).toHaveBeenCalledTimes(1);

    // Usuário cancela (RESET) durante o PBKDF2
    runner.cancel();
    gate.resolve({ success: true });
    await Promise.all([p1, p2]);

    expect(disableLock).not.toHaveBeenCalled();
    expect(actions).toEqual([{ type: "SET_SAVING", value: true }]);
  });

  it("verifyToDisable lê loadSettings uma única vez na falha e trata not_configured e exceções", async () => {
    const actions: LocalAction[] = [];
    const loadSettings = vi.fn(async () => makeSettings());
    const runner = createSecuritySetupRunner({
      verifyPin: vi.fn(async () => ({ success: false as const, reason: "not_configured" as const })),
      setupPin: vi.fn(async () => makeSettings()),
      loadSettings,
      disableLock: vi.fn(async () => {}),
      getRemainingLockMs: () => 0,
      setSettings: vi.fn(),
      dispatch: (a) => actions.push(a),
      onSuccessFeedback: vi.fn(),
      onErrorFeedback: vi.fn(),
      yieldBeforeHash: async () => {},
    });

    await runner.verifyToDisable("1234", makeSettings());
    expect(loadSettings).toHaveBeenCalledTimes(1);
    expect(actions).toEqual([
      { type: "SET_SAVING", value: true },
      { type: "SET_ERROR", message: "PIN não configurado." },
    ]);
  });

  it("verifyCurrentToChange exibe contagem regressiva em locked e recupera saving em exceção", async () => {
    const actions: LocalAction[] = [];
    const verifyPin = vi
      .fn()
      .mockResolvedValueOnce({ success: false as const, reason: "locked" as const })
      .mockRejectedValueOnce(new Error("boom"));

    const runner = createSecuritySetupRunner({
      verifyPin,
      setupPin: vi.fn(async () => makeSettings()),
      loadSettings: vi.fn(async () => makeSettings({ lockedUntil: Date.now() + 18_500 })),
      disableLock: vi.fn(async () => {}),
      getRemainingLockMs: () => 18_500,
      setSettings: vi.fn(),
      dispatch: (a) => actions.push(a),
      onSuccessFeedback: vi.fn(),
      onErrorFeedback: vi.fn(),
      yieldBeforeHash: async () => {},
    });

    await runner.verifyCurrentToChange("1234", makeSettings());
    await runner.verifyCurrentToChange("1234", makeSettings());

    expect(actions).toEqual([
      { type: "SET_SAVING", value: true },
      { type: "SET_ERROR", message: "Bloqueado. Aguarde 19s." },
      { type: "SET_SAVING", value: true },
      { type: "SET_ERROR", message: "Erro ao verificar PIN. Tente novamente." },
    ]);
  });

  it("savePin captura exceção do setupPin e despacha SET_ERROR para não prender saving", async () => {
    const actions: LocalAction[] = [];
    const runner = createSecuritySetupRunner({
      verifyPin: vi.fn(async () => ({ success: true as const })),
      setupPin: vi.fn(async () => {
        throw new Error("storage full");
      }),
      loadSettings: vi.fn(async () => makeSettings()),
      disableLock: vi.fn(async () => {}),
      getRemainingLockMs: () => 0,
      setSettings: vi.fn(),
      dispatch: (a) => actions.push(a),
      onSuccessFeedback: vi.fn(),
      onErrorFeedback: vi.fn(),
      yieldBeforeHash: async () => {},
    });

    await runner.savePin("1234", makeSettings(), "enable");
    await runner.savePin("1234", makeSettings(), "change");

    expect(actions).toEqual([
      { type: "SET_SAVING", value: true },
      { type: "SET_ERROR", message: "Erro ao salvar PIN. Tente novamente." },
      { type: "SET_SAVING", value: true },
      { type: "SET_ERROR", message: "Erro ao alterar PIN. Tente novamente." },
    ]);
  });
});
