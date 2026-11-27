/**
 * SoundManager: Gerencia os efeitos sonoros do app.
 * Siga estas diretrizes para baixar novos sons (formato MP3):
 *
 * - tap: Clique sutil em botões (Ex: "UI click minimal", "Soft wood hit")
 * - success: Ação concluída com êxito (Ex: "Magical chime", "Short harp")
 * - error: Erro ou aviso (Ex: "Minimal fail", "Soft thud")
 * - trash: Ao excluir transação (Ex: "Paper crumble", "Metal slide")
 * - pop: Abertura de modais ou balões (Ex: "Bubble pop", "Light switch")
 * - levelUp: Subida de nível (Ex: "Heavenly fanfare", "Cinematic crescendo")
 * - reveal: Revelação do troféu surpresa (Ex: "Magic wand reveal", "Shimmering")
 * - share: Ao clicar em compartilhar (Ex: "Digital woosh", "Camera shutter soft")
 * - tabSwitch: Troca entre abas (Ex: "Slide tick", "Bass blip")
 */
export type SoundEffect =
  | "tap"
  | "success"
  | "error"
  | "trash"
  | "pop"
  | "levelUp"
  | "reveal"
  | "share"
  | "tabSwitch";

export const SOUND_EFFECT_AUDIO_MODE = {
  interruptionMode: "mixWithOthers" as const,
};

interface NativeAudioPlayer {
  seekTo: (seconds: number) => Promise<void> | void;
  play: () => void;
  remove: () => void;
}

interface ExpoAudioAdapter {
  createAudioPlayer: (
    source: unknown,
    options?: { keepAudioSessionActive?: boolean },
  ) => NativeAudioPlayer;
  setAudioModeAsync: (mode: { interruptionMode?: "mixWithOthers" | "doNotMix" | "duckOthers" }) => Promise<void>;
}

export interface SoundManagerDeps {
  isWeb?: () => boolean;
  loadAssets?: () => Record<SoundEffect, unknown>;
  loadExpoAudio?: () => ExpoAudioAdapter;
}

// `process.env.EXPO_OS` é inlined no build do Expo e dispensa importar `react-native` (testável no Vitest).
const defaultIsWeb = (): boolean => process.env.EXPO_OS === "web";

function defaultLoadAssets(): Record<SoundEffect, unknown> {
  return {
    tap: require("../../assets/sounds/tap.mp3"),
    success: require("../../assets/sounds/success.mp3"),
    error: require("../../assets/sounds/error.mp3"),
    trash: require("../../assets/sounds/trash.mp3"),
    pop: require("../../assets/sounds/pop.mp3"),
    levelUp: require("../../assets/sounds/level-up.mp3"),
    reveal: require("../../assets/sounds/reveal.mp3"),
    share: require("../../assets/sounds/share.mp3"),
    tabSwitch: require("../../assets/sounds/tab-switch.mp3"),
  };
}

function defaultLoadExpoAudio(): ExpoAudioAdapter {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- import tardio: expo-audio só é carregado no nativo
  return require("expo-audio") as ExpoAudioAdapter;
}

export class SoundManager {
  private players: Map<SoundEffect, NativeAudioPlayer> = new Map();
  private webAudios: Map<SoundEffect, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private isLoaded: boolean = false;
  private audioModeConfigured: boolean = false;
  private initPromise: Promise<void> | null = null;
  private initGeneration: number = 0;
  private deps: Required<SoundManagerDeps>;

  constructor(deps: SoundManagerDeps = {}) {
    this.deps = {
      isWeb: deps.isWeb ?? defaultIsWeb,
      loadAssets: deps.loadAssets ?? defaultLoadAssets,
      loadExpoAudio: deps.loadExpoAudio ?? defaultLoadExpoAudio,
    };
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public async init() {
    if (this.isLoaded) return;
    if (this.initPromise) return this.initPromise;

    const generation = ++this.initGeneration;
    const promise = this.performInit(generation).finally(() => {
      if (this.initPromise === promise) {
        this.initPromise = null;
      }
    });
    this.initPromise = promise;
    return promise;
  }

  private async performInit(generation: number) {
    try {
      const assets = this.deps.loadAssets();
      if (this.deps.isWeb()) {
        // Web: use HTML5 Audio with resolved asset URIs
        for (const [key, asset] of Object.entries(assets)) {
          try {
            // Metro/webpack resolves require() for mp3 to a URI string or module with uri
            const assetObj = asset as { uri?: string; default?: string } | null;
            const uri = typeof asset === "string" ? asset
              : typeof asset === "number" ? asset // bundled asset id — won't work on web
              : assetObj?.uri ?? assetObj?.default ?? asset;
            if (typeof uri === "string") {
              const audio = new Audio(uri);
              audio.preload = "auto";
              this.webAudios.set(key as SoundEffect, audio);
            }
          } catch (err) {
            console.warn(`Could not load web sound ${key}:`, err);
          }
        }
        if (generation !== this.initGeneration) return;
        this.isLoaded = true;
      } else {
        // Nativo: usa a API oficial de `expo-audio` sem patch nativo em AudioModule.kt/AudioPlayer.kt.
        // No expo-audio@55.0.18, AudioPlayer usa AudioAttributes.DEFAULT com `handleAudioFocus = false`
        // no ExoPlayer (sem o patch legado de USAGE_ASSISTANCE_SONIFICATION), e AudioModule.requestAudioFocus()
        // faz early-return quando `interruptionMode == MIX_WITH_OTHERS`, evitando pausar música/vídeo
        // de outros apps (YouTube, Spotify). Os callers de voz (`useVoiceRecorder`, `VoiceOutputService`,
        // `app/ai-chat.tsx`) preservam ou restauram `interruptionMode: "mixWithOthers"`.
        const { createAudioPlayer, setAudioModeAsync } = this.deps.loadExpoAudio();
        try {
          await setAudioModeAsync(SOUND_EFFECT_AUDIO_MODE);
          if (generation !== this.initGeneration) return;
          this.audioModeConfigured = true;
        } catch (err) {
          if (generation !== this.initGeneration) return;
          this.audioModeConfigured = false;
          console.warn("Could not configure audio interruptionMode:", err);
        }
        if (generation !== this.initGeneration) return;
        for (const [key, asset] of Object.entries(assets)) {
          try {
            const player = createAudioPlayer(asset, { keepAudioSessionActive: true });
            this.players.set(key as SoundEffect, player);
          } catch (err) {
            console.warn(`Could not load sound ${key}:`, err);
          }
        }
        this.isLoaded = true;
      }
    } catch (e) {
      console.warn("Failed to load sounds", e);
    }
  }

  public async play(effect: SoundEffect) {
    if (!this.enabled || !this.isLoaded) return;

    if (this.deps.isWeb()) {
      const audio = this.webAudios.get(effect);
      if (audio) {
        try {
          audio.currentTime = 0;
          await audio.play();
        } catch {
          // Browser may block autoplay until user interaction
        }
      }
      return;
    }

    if (!this.audioModeConfigured) {
      try {
        await this.deps.loadExpoAudio().setAudioModeAsync(SOUND_EFFECT_AUDIO_MODE);
        this.audioModeConfigured = true;
      } catch {
        // Mantém audioModeConfigured=false para tentar novamente na próxima reprodução
      }
    }

    const player = this.players.get(effect);
    if (player) {
      try {
        await player.seekTo(0);
        player.play();
      } catch {
        // Ignore playback errors silently
      }
    }
  }

  public async unload() {
    this.initGeneration++;
    this.initPromise = null;
    for (const player of this.players.values()) {
      player.remove();
    }
    this.players.clear();
    this.webAudios.clear();
    this.isLoaded = false;
    this.audioModeConfigured = false;
  }
}

export const soundManager = new SoundManager();
