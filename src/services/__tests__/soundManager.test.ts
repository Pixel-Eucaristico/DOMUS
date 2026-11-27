import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SOUND_EFFECT_AUDIO_MODE,
  SoundManager,
  type SoundEffect,
} from "../SoundManager";
import {
  VOICE_IDLE_AUDIO_MODE,
  VOICE_PLAYBACK_AUDIO_MODE,
  VOICE_RECORDING_AUDIO_MODE,
  cancelVoiceRecording,
  playVoiceReplay,
  startVoiceRecording,
  stopVoiceRecording,
  type VoiceRecorderState,
} from "../../hooks/voiceRecorderLifecycle";

const ROOT = path.resolve(__dirname, "../../..");

const FAKE_ASSETS: Record<SoundEffect, unknown> = {
  tap: 1,
  success: 2,
  error: 3,
  trash: 4,
  pop: 5,
  levelUp: 6,
  reveal: 7,
  share: 8,
  tabSwitch: 9,
};

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__tests__" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
}

function extractBalancedCallArgs(code: string, openParenIdx: number): string {
  let depth = 0;
  for (let i = openParenIdx; i < code.length; i++) {
    const ch = code[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return code.slice(openParenIdx + 1, i).trim();
    }
  }
  return "";
}

const KNOWN_SAFE_AUDIO_MODE_CONSTS = new Set([
  "SOUND_EFFECT_AUDIO_MODE",
  "VOICE_RECORDING_AUDIO_MODE",
  "VOICE_IDLE_AUDIO_MODE",
  "VOICE_PLAYBACK_AUDIO_MODE",
]);

describe("SoundManager (foco de áudio via expo-audio sem patch nativo)", () => {
  const originalExpoOs = process.env.EXPO_OS;

  afterEach(() => {
    if (originalExpoOs === undefined) {
      delete process.env.EXPO_OS;
    } else {
      process.env.EXPO_OS = originalExpoOs;
    }
  });

  it("configura interruptionMode='mixWithOthers' no nativo antes de inicializar os players", async () => {
    process.env.EXPO_OS = "android";
    const callOrder: string[] = [];
    const setAudioModeAsync = vi.fn(async () => {
      callOrder.push("setAudioModeAsync");
    });
    const fakePlayer = {
      seekTo: vi.fn(async () => {}),
      play: vi.fn(),
      remove: vi.fn(),
    };
    const createAudioPlayer = vi.fn(() => {
      callOrder.push("createAudioPlayer");
      return fakePlayer;
    });

    const mgr = new SoundManager({
      loadAssets: () => FAKE_ASSETS,
      loadExpoAudio: () => ({ createAudioPlayer, setAudioModeAsync }),
    });

    await mgr.init();
    await mgr.init();

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(setAudioModeAsync).toHaveBeenCalledWith(SOUND_EFFECT_AUDIO_MODE);
    expect(SOUND_EFFECT_AUDIO_MODE).toEqual({ interruptionMode: "mixWithOthers" });
    expect(callOrder[0]).toBe("setAudioModeAsync");
    expect(createAudioPlayer).toHaveBeenCalledTimes(Object.keys(FAKE_ASSETS).length);
    for (const asset of Object.values(FAKE_ASSETS)) {
      expect(createAudioPlayer).toHaveBeenCalledWith(asset, { keepAudioSessionActive: true });
    }

    await mgr.play("tap");
    expect(fakePlayer.seekTo).toHaveBeenCalledWith(0);
    expect(fakePlayer.play).toHaveBeenCalledTimes(1);

    mgr.setEnabled(false);
    await mgr.play("tap");
    expect(fakePlayer.play).toHaveBeenCalledTimes(1);

    await mgr.unload();
    expect(fakePlayer.remove).toHaveBeenCalledTimes(Object.keys(FAKE_ASSETS).length);
  });

  it("deduplica chamadas concorrentes de init() sem criar players duplicados", async () => {
    process.env.EXPO_OS = "android";
    let resolveAudioMode!: () => void;
    const setAudioModeAsync = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAudioMode = resolve;
        }),
    );
    const createAudioPlayer = vi.fn(() => ({
      seekTo: vi.fn(async () => {}),
      play: vi.fn(),
      remove: vi.fn(),
    }));

    const mgr = new SoundManager({
      loadAssets: () => FAKE_ASSETS,
      loadExpoAudio: () => ({ createAudioPlayer, setAudioModeAsync }),
    });

    const p1 = mgr.init();
    const p2 = mgr.init();
    resolveAudioMode();
    await Promise.all([p1, p2]);

    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledTimes(Object.keys(FAKE_ASSETS).length);
  });

  it("não cria players órfãos se unload() ocorrer enquanto init() aguarda setAudioModeAsync e permite novo init() imediato", async () => {
    process.env.EXPO_OS = "android";
    let resolveFirstAudioMode!: () => void;
    let calls = 0;
    const setAudioModeAsync = vi.fn(() => {
      calls++;
      if (calls === 1) {
        return new Promise<void>((resolve) => {
          resolveFirstAudioMode = resolve;
        });
      }
      return Promise.resolve();
    });
    const fakePlayer = {
      seekTo: vi.fn(async () => {}),
      play: vi.fn(),
      remove: vi.fn(),
    };
    const createAudioPlayer = vi.fn(() => fakePlayer);

    const mgr = new SoundManager({
      loadAssets: () => FAKE_ASSETS,
      loadExpoAudio: () => ({ createAudioPlayer, setAudioModeAsync }),
    });

    const firstInit = mgr.init();
    await mgr.unload();

    // Novo init() não deve ficar preso na promise antiga limpa por unload()
    const secondInit = mgr.init();
    await secondInit;
    expect(setAudioModeAsync).toHaveBeenCalledTimes(2);
    expect(createAudioPlayer).toHaveBeenCalledTimes(Object.keys(FAKE_ASSETS).length);

    // Quando o primeiro setAudioModeAsync finalmente resolver, não pode criar players duplicados
    resolveFirstAudioMode();
    await firstInit;
    expect(createAudioPlayer).toHaveBeenCalledTimes(Object.keys(FAKE_ASSETS).length);
  });

  it("não deixa audioModeConfigured=true se unload() acontecer durante setAudioModeAsync", async () => {
    process.env.EXPO_OS = "android";
    let resolveFirst!: () => void;
    let first = true;
    const setAudioModeAsync = vi.fn(() => {
      if (first) {
        first = false;
        return new Promise<void>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.reject(new Error("falha transitória"));
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const createAudioPlayer = vi.fn(() => ({
      seekTo: vi.fn(async () => {}),
      play: vi.fn(),
      remove: vi.fn(),
    }));
    const mgr = new SoundManager({
      loadAssets: () => FAKE_ASSETS,
      loadExpoAudio: () => ({ createAudioPlayer, setAudioModeAsync }),
    });

    const staleInit = mgr.init();
    await mgr.unload();
    resolveFirst();
    await staleInit;

    // Novo init() rejeita setAudioModeAsync -> play() deve tentar reconfigurar (audioModeConfigured não foi corrompido pelo init obsoleto)
    await mgr.init();
    await mgr.play("tap");
    expect(setAudioModeAsync).toHaveBeenCalledTimes(3);
    warnSpy.mockRestore();
  });

  it("tenta configurar interruptionMode novamente no play() se setAudioModeAsync rejeitou no init()", async () => {
    process.env.EXPO_OS = "android";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const setAudioModeAsync = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("audio service unavailable"))
      .mockResolvedValueOnce(undefined);
    const fakePlayer = {
      seekTo: vi.fn(async () => {}),
      play: vi.fn(),
      remove: vi.fn(),
    };
    const mgr = new SoundManager({
      loadAssets: () => FAKE_ASSETS,
      loadExpoAudio: () => ({
        setAudioModeAsync,
        createAudioPlayer: vi.fn(() => fakePlayer),
      }),
    });

    await mgr.init();
    await mgr.play("success");
    await mgr.play("tap");

    expect(setAudioModeAsync).toHaveBeenCalledTimes(2);
    expect(setAudioModeAsync).toHaveBeenLastCalledWith(SOUND_EFFECT_AUDIO_MODE);
    expect(fakePlayer.play).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });

  it("não carrega expo-audio na web (EXPO_OS='web')", async () => {
    process.env.EXPO_OS = "web";
    const loadExpoAudio = vi.fn();
    const mgr = new SoundManager({
      loadAssets: () => FAKE_ASSETS,
      loadExpoAudio,
    });

    await mgr.init();
    expect(loadExpoAudio).not.toHaveBeenCalled();
  });

  it("ciclo de voz (voiceRecorderLifecycle) configura doNotMix na gravação e sempre restaura mixWithOthers em sucesso, erro e cancelamento", async () => {
    const state: VoiceRecorderState = { active: false };
    const setAudioMode = vi.fn(async () => {});
    const recorder = {
      prepareToRecordAsync: vi.fn(async () => {}),
      record: vi.fn(),
      stop: vi.fn(async () => {}),
      uri: "file:///tmp/rec.m4a",
    };

    // 1. Início bem-sucedido + guarda contra double-start
    const started = await startVoiceRecording(state, {
      requestPermissions: async () => ({ granted: true }),
      setAudioMode,
      recorder,
    });
    expect(started).toBe(true);
    expect(state.active).toBe(true);
    expect(setAudioMode).toHaveBeenCalledWith(VOICE_RECORDING_AUDIO_MODE);
    expect(VOICE_RECORDING_AUDIO_MODE.interruptionMode).toBe("doNotMix");

    const secondStart = await startVoiceRecording(state, {
      requestPermissions: async () => ({ granted: true }),
      setAudioMode,
      recorder,
    });
    expect(secondStart).toBe(false);
    expect(setAudioMode).toHaveBeenCalledTimes(1);

    // 2. stopRecording restaura mixWithOthers mesmo quando recorder.stop() lança erro
    recorder.stop.mockRejectedValueOnce(new Error("stop failed"));
    await expect(stopVoiceRecording(state, { setAudioMode, recorder })).rejects.toThrow("stop failed");
    expect(state.active).toBe(false);
    expect(setAudioMode).toHaveBeenLastCalledWith(VOICE_IDLE_AUDIO_MODE);
    expect(VOICE_IDLE_AUDIO_MODE.interruptionMode).toBe("mixWithOthers");

    // 3. Falha em prepareToRecordAsync() restaura mixWithOthers e mantém active=false
    recorder.prepareToRecordAsync.mockRejectedValueOnce(new Error("mic busy"));
    await expect(
      startVoiceRecording(state, {
        requestPermissions: async () => ({ granted: true }),
        setAudioMode,
        recorder,
      }),
    ).rejects.toThrow("mic busy");
    expect(state.active).toBe(false);
    expect(setAudioMode).toHaveBeenLastCalledWith(VOICE_IDLE_AUDIO_MODE);

    // 4. cancelVoiceRecording restaura mixWithOthers mesmo se stop() falhar
    await startVoiceRecording(state, {
      requestPermissions: async () => ({ granted: true }),
      setAudioMode,
      recorder,
    });
    recorder.stop.mockRejectedValueOnce(new Error("already stopped"));
    await cancelVoiceRecording(state, { setAudioMode, recorder });
    expect(state.active).toBe(false);
    expect(setAudioMode).toHaveBeenLastCalledWith(VOICE_IDLE_AUDIO_MODE);
  });

  it("bloqueia double-tap concorrente em startVoiceRecording antes do primeiro await", async () => {
    const state: VoiceRecorderState = { active: false };
    let resolvePermissions!: (res: { granted: boolean }) => void;
    const requestPermissions = vi.fn(
      () =>
        new Promise<{ granted: boolean }>((resolve) => {
          resolvePermissions = resolve;
        }),
    );
    const setAudioMode = vi.fn(async () => {});
    const recorder = {
      prepareToRecordAsync: vi.fn(async () => {}),
      record: vi.fn(),
      stop: vi.fn(async () => {}),
      uri: "file:///tmp/rec.m4a",
    };

    const p1 = startVoiceRecording(state, { requestPermissions, setAudioMode, recorder });
    const p2 = startVoiceRecording(state, { requestPermissions, setAudioMode, recorder });

    expect(await p2).toBe(false);
    expect(requestPermissions).toHaveBeenCalledTimes(1);

    resolvePermissions({ granted: true });
    expect(await p1).toBe(true);
    expect(state.active).toBe(true);
    expect(state.starting).toBe(false);
    expect(recorder.record).toHaveBeenCalledTimes(1);
  });

  it("cancelVoiceRecording durante prepareToRecordAsync pendente impede record() e restaura VOICE_IDLE_AUDIO_MODE", async () => {
    const state: VoiceRecorderState = { active: false };
    let resolvePrepare!: () => void;
    const setAudioMode = vi.fn(async () => {});
    const recorder = {
      prepareToRecordAsync: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePrepare = resolve;
          }),
      ),
      record: vi.fn(),
      stop: vi.fn(async () => {}),
      uri: "file:///tmp/rec.m4a",
    };

    const startPromise = startVoiceRecording(state, {
      requestPermissions: async () => ({ granted: true }),
      setAudioMode,
      recorder,
    });

    // Aguarda até prepareToRecordAsync ter sido chamado
    await vi.waitFor(() => expect(recorder.prepareToRecordAsync).toHaveBeenCalledTimes(1));
    expect(state.starting).toBe(true);
    expect(state.active).toBe(false);

    await cancelVoiceRecording(state, { setAudioMode, recorder });
    expect(state.cancelled).toBe(true);

    resolvePrepare();
    expect(await startPromise).toBe(false);
    expect(recorder.record).not.toHaveBeenCalled();
    expect(state.active).toBe(false);
    expect(state.starting).toBe(false);
    expect(setAudioMode).toHaveBeenLastCalledWith(VOICE_IDLE_AUDIO_MODE);
  });

  it("playVoiceReplay configura VOICE_PLAYBACK_AUDIO_MODE (mixWithOthers) antes de tocar e libera o player ao terminar, em erro ou via stop()", async () => {
    const callOrder: string[] = [];
    const setAudioMode = vi.fn(async () => {
      callOrder.push("setAudioMode");
    });
    let onStatus: ((s: { didJustFinish?: boolean; error?: string | null }) => void) | undefined;
    const subRemove = vi.fn();
    const player = {
      play: vi.fn(() => {
        callOrder.push("play");
      }),
      pause: vi.fn(),
      remove: vi.fn(),
      addListener: vi.fn(
        (_ev: "playbackStatusUpdate", cb: (s: { didJustFinish?: boolean; error?: string | null }) => void) => {
          onStatus = cb;
          return { remove: subRemove };
        },
      ),
    };

    const handle = await playVoiceReplay("file:///tmp/msg.m4a", {
      setAudioMode,
      createPlayer: vi.fn(() => player),
    });

    expect(setAudioMode).toHaveBeenCalledWith(VOICE_PLAYBACK_AUDIO_MODE);
    expect(VOICE_PLAYBACK_AUDIO_MODE).toEqual({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: "mixWithOthers",
    });
    expect(callOrder).toEqual(["setAudioMode", "play"]);

    onStatus?.({ didJustFinish: true });
    expect(subRemove).toHaveBeenCalledTimes(1);
    expect(player.remove).toHaveBeenCalledTimes(1);
    // stop() é idempotente após cleanup automático
    handle.stop();
    expect(player.remove).toHaveBeenCalledTimes(1);

    // Cleanup em status.error
    let onErrStatus: ((s: { didJustFinish?: boolean; error?: string | null }) => void) | undefined;
    const errSubRemove = vi.fn();
    const errPlayer = {
      play: vi.fn(),
      pause: vi.fn(),
      remove: vi.fn(),
      addListener: vi.fn(
        (_ev: "playbackStatusUpdate", cb: (s: { didJustFinish?: boolean; error?: string | null }) => void) => {
          onErrStatus = cb;
          return { remove: errSubRemove };
        },
      ),
    };
    await playVoiceReplay("file:///tmp/err.m4a", {
      setAudioMode,
      createPlayer: vi.fn(() => errPlayer),
    });
    onErrStatus?.({ error: "decoder failed" });
    expect(errSubRemove).toHaveBeenCalledTimes(1);
    expect(errPlayer.remove).toHaveBeenCalledTimes(1);

    // Cleanup se player.play() lançar erro síncrono
    const throwSubRemove = vi.fn();
    const throwPlayer = {
      play: vi.fn(() => {
        throw new Error("play failed");
      }),
      pause: vi.fn(),
      remove: vi.fn(),
      addListener: vi.fn(() => ({ remove: throwSubRemove })),
    };
    await expect(
      playVoiceReplay("file:///tmp/throw.m4a", {
        setAudioMode,
        createPlayer: vi.fn(() => throwPlayer),
      }),
    ).rejects.toThrow("play failed");
    expect(throwSubRemove).toHaveBeenCalledTimes(1);
    expect(throwPlayer.remove).toHaveBeenCalledTimes(1);
  });

  it("expo-audio upstream Android preserva MIX_WITH_OTHERS sem roubar foco e setAudioAttributes(..., false)", () => {
    const audioModulePath = path.join(
      ROOT,
      "node_modules/expo-audio/android/src/main/java/expo/modules/audio/AudioModule.kt",
    );
    const audioPlayerPath = path.join(
      ROOT,
      "node_modules/expo-audio/android/src/main/java/expo/modules/audio/AudioPlayer.kt",
    );
    expect(fs.existsSync(audioModulePath)).toBe(true);
    expect(fs.existsSync(audioPlayerPath)).toBe(true);

    const audioModuleKt = fs.readFileSync(audioModulePath, "utf8");
    const audioPlayerKt = fs.readFileSync(audioPlayerPath, "utf8");

    expect(audioModuleKt).toContain("InterruptionMode.MIX_WITH_OTHERS");
    expect(audioPlayerKt).toMatch(/setAudioAttributes\s*\([^,]+,\s*false\s*\)/);
  });

  it("nenhum caller real de setAudioModeAsync/setAudioMode em app/, src/ ou packages/ omite interruptionMode", () => {
    const files = [
      ...collectSourceFiles(path.join(ROOT, "app")),
      ...collectSourceFiles(path.join(ROOT, "src")),
      ...collectSourceFiles(path.join(ROOT, "packages")),
    ];

    const callOpenRe = /\bsetAudioMode(?:Async)?\s*\(/g;
    let totalCalls = 0;

    for (const file of files) {
      const raw = fs.readFileSync(file, "utf8");
      if (!raw.includes("setAudioMode")) continue;
      const code = stripComments(raw);
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");

      for (const match of code.matchAll(callOpenRe)) {
        const prefix = code.slice(Math.max(0, match.index! - 12), match.index!);
        // Ignora declarações de interface/tipo (`setAudioMode: (...) =>`)
        if (/\bfunction\s+$/.test(prefix)) continue;
        const openIdx = match.index! + match[0].length - 1;
        const arg = extractBalancedCallArgs(code, openIdx);
        // Ignora assinatura de tipo em interface (ex.: `mode: AudioModeConfig`)
        if (/^[a-zA-Z_$][\w$]*\s*:\s*/.test(arg)) continue;

        totalCalls++;
        const isSafeConst = KNOWN_SAFE_AUDIO_MODE_CONSTS.has(arg);
        const hasInlineMode =
          arg.startsWith("{") &&
          /interruptionMode\s*:\s*["'](mixWithOthers|doNotMix|duckOthers)["']/.test(arg);
        expect(
          isSafeConst || hasInlineMode,
          `${rel} chamou setAudioMode sem interruptionMode explícito: setAudioMode(${arg})`,
        ).toBe(true);
      }
    }

    // Garante que o scanner encontrou SoundManager + voiceRecorderLifecycle + VoiceOutputService
    expect(totalCalls).toBeGreaterThanOrEqual(7);
  });
});
