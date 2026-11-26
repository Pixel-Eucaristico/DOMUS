export interface AudioModeConfig {
  allowsRecording?: boolean;
  playsInSilentMode?: boolean;
  interruptionMode: "mixWithOthers" | "doNotMix" | "duckOthers";
}

export const VOICE_RECORDING_AUDIO_MODE: AudioModeConfig = {
  allowsRecording: true,
  playsInSilentMode: true,
  interruptionMode: "doNotMix",
};

export const VOICE_IDLE_AUDIO_MODE: AudioModeConfig = {
  allowsRecording: false,
  interruptionMode: "mixWithOthers",
};

export const VOICE_PLAYBACK_AUDIO_MODE: AudioModeConfig = {
  playsInSilentMode: true,
  allowsRecording: false,
  interruptionMode: "mixWithOthers",
};

export interface VoiceRecorderAdapter {
  prepareToRecordAsync: () => Promise<void>;
  record: () => void;
  stop: () => Promise<void>;
  readonly uri: string | null;
}

export interface VoiceRecorderLifecycleDeps {
  requestPermissions: () => Promise<{ granted: boolean }>;
  setAudioMode: (mode: AudioModeConfig) => Promise<void>;
  recorder: VoiceRecorderAdapter;
}

export interface VoiceRecorderState {
  active: boolean;
}

export async function startVoiceRecording(
  state: VoiceRecorderState,
  deps: VoiceRecorderLifecycleDeps,
): Promise<boolean> {
  if (state.active) return false;

  const { granted } = await deps.requestPermissions();
  if (!granted) throw new Error("Permissão de microfone negada");

  await deps.setAudioMode(VOICE_RECORDING_AUDIO_MODE);
  try {
    await deps.recorder.prepareToRecordAsync();
    deps.recorder.record();
  } catch (err) {
    await deps.setAudioMode(VOICE_IDLE_AUDIO_MODE).catch(() => {});
    throw err;
  }
  state.active = true;
  return true;
}

export async function stopVoiceRecording(
  state: VoiceRecorderState,
  deps: Pick<VoiceRecorderLifecycleDeps, "setAudioMode" | "recorder">,
): Promise<string | null> {
  if (!state.active) return null;

  state.active = false;
  try {
    await deps.recorder.stop();
  } finally {
    await deps.setAudioMode(VOICE_IDLE_AUDIO_MODE).catch(() => {});
  }
  return deps.recorder.uri ?? null;
}

export async function cancelVoiceRecording(
  state: VoiceRecorderState,
  deps: Pick<VoiceRecorderLifecycleDeps, "setAudioMode" | "recorder">,
): Promise<void> {
  if (!state.active) return;

  state.active = false;
  try {
    await deps.recorder.stop();
  } catch {
    // ignore stop failures during cancel/unmount
  } finally {
    await deps.setAudioMode(VOICE_IDLE_AUDIO_MODE).catch(() => {});
  }
}

export interface ReplayAudioPlayer {
  play: () => void;
  remove?: () => void;
  addListener?: (
    event: "playbackStatusUpdate",
    listener: (status: { didJustFinish?: boolean }) => void,
  ) => { remove?: () => void } | void;
}

export async function playVoiceReplay(
  uri: string,
  deps: {
    setAudioMode: (mode: AudioModeConfig) => Promise<void>;
    createPlayer: (source: { uri: string }) => ReplayAudioPlayer;
  },
): Promise<ReplayAudioPlayer> {
  await deps.setAudioMode(VOICE_PLAYBACK_AUDIO_MODE);
  const player = deps.createPlayer({ uri });
  if (typeof player.addListener === "function") {
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status?.didJustFinish) {
        try {
          sub?.remove?.();
        } catch {
          // ignore
        }
        try {
          player.remove?.();
        } catch {
          // ignore
        }
      }
    });
  }
  player.play();
  return player;
}
