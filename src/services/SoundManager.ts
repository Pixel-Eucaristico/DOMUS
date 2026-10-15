import { Platform } from "react-native";

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

const SOUND_ASSETS: Record<SoundEffect, any> = {
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

class SoundManager {
  private players: Map<SoundEffect, any> = new Map();
  private webAudios: Map<SoundEffect, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private isLoaded: boolean = false;
  private isWeb: boolean = Platform.OS === "web";

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public async init() {
    if (this.isLoaded) return;

    try {
      if (this.isWeb) {
        // Web: use HTML5 Audio with resolved asset URIs
        for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
          try {
            // Metro/webpack resolves require() for mp3 to a URI string or module with uri
            const uri = typeof asset === "string" ? asset
              : typeof asset === "number" ? asset // bundled asset id — won't work on web
              : asset?.uri ?? asset?.default ?? asset;
            if (typeof uri === "string") {
              const audio = new Audio(uri);
              audio.preload = "auto";
              this.webAudios.set(key as SoundEffect, audio);
            }
          } catch (err) {
            console.warn(`Could not load web sound ${key}:`, err);
          }
        }
        this.isLoaded = true;
      } else {
        // Native: use expo-audio
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- import tardio: expo-audio só é carregado no nativo
        const { createAudioPlayer } = require("expo-audio");
        for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
          try {
            const player = createAudioPlayer(asset);
            this.players.set(key as SoundEffect, player);
          } catch (err) {
            console.warn(`Could not load sound ${key}:`, err);
          }
        }
        // Audio focus: resolvido via patch-package no AudioModule.kt nativo.
        // O default de interruptionMode foi alterado de null para MIX_WITH_OTHERS,
        // garantindo que requestAudioFocus() nunca seja chamado. Isso evita que
        // efeitos sonoros pausem videos/musica de outros apps (YouTube, Spotify).
        this.isLoaded = true;
      }
    } catch (e) {
      console.warn("Failed to load sounds", e);
    }
  }

  public async play(effect: SoundEffect) {
    if (!this.enabled || !this.isLoaded) return;

    if (this.isWeb) {
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
    for (const player of this.players.values()) {
      player.remove();
    }
    this.players.clear();
    this.webAudios.clear();
    this.isLoaded = false;
  }
}

export const soundManager = new SoundManager();
