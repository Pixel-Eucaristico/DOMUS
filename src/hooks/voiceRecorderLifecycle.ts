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
  starting?: boolean;
  cancelled?: boolean;
}

export async function startVoiceRecording(
  state: VoiceRecorderState,
  deps: VoiceRecorderLifecycleDeps,
): Promise<boolean> {
  if (state.active || state.starting) return false;

  state.starting = true;
  state.cancelled = false;
  try {
    const { granted } = await deps.requestPermissions();
    if (state.cancelled) return false;
    if (!granted) throw new Error("Permissão de microfone negada");

    await deps.setAudioMode(VOICE_RECORDING_AUDIO_MODE);
    if (state.cancelled) {
      await deps.setAudioMode(VOICE_IDLE_AUDIO_MODE).catch(() => {});
      return false;
    }

    try {
      await deps.recorder.prepareToRecordAsync();
      if (state.cancelled) {
        await deps.setAudioMode(VOICE_IDLE_AUDIO_MODE).catch(() => {});
        return false;
      }
      deps.recorder.record();
    } catch (err) {
      await deps.setAudioMode(VOICE_IDLE_AUDIO_MODE).catch(() => {});
      throw err;
    }

    state.active = true;
    return true;
  } finally {
    state.starting = false;
  }
}

export async function stopVoiceRecording(
  state: VoiceRecorderState,
  deps: Pick<VoiceRecorderLifecycleDeps, "setAudioMode" | "recorder">,
): Promise<string | null> {
  if (!state.active) return null;

  state.active = false;
  state.cancelled = false;
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
  if (!state.active && !state.starting) return;

  state.cancelled = true;
  if (!state.active) {
    await deps.setAudioMode(VOICE_IDLE_AUDIO_MODE).catch(() => {});
    return;
  }

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
  pause?: () => void;
  remove?: () => void;
  addListener?: (
    event: "playbackStatusUpdate",
    listener: (status: { didJustFinish?: boolean; error?: string | null }) => void,
  ) => { remove?: () => void } | void;
}

export interface VoiceReplayHandle {
  player: ReplayAudioPlayer;
  stop: () => void;
}

export async function playVoiceReplay(
  uri: string,
  deps: {
    setAudioMode: (mode: AudioModeConfig) => Promise<void>;
    createPlayer: (source: { uri: string }) => ReplayAudioPlayer;
  },
): Promise<VoiceReplayHandle> {
  await deps.setAudioMode(VOICE_PLAYBACK_AUDIO_MODE);
  const player = deps.createPlayer({ uri });
  let sub: { remove?: () => void } | void;
  let cleaned = false;

  const stop = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      sub?.remove?.();
    } catch {
      // ignore
    }
    try {
      player.pause?.();
    } catch {
      // ignore
    }
    try {
      player.remove?.();
    } catch {
      // ignore
    }
  };

  if (typeof player.addListener === "function") {
    sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status?.didJustFinish || status?.error) {
        stop();
      }
    });
  }

  try {
    player.play();
  } catch (err) {
    stop();
    throw err;
  }

  return { player, stop };
}
