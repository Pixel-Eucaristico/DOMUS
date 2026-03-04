import { Audio } from "expo-av";

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
  private sounds: Map<SoundEffect, Audio.Sound> = new Map();
  private enabled: boolean = true;
  private isLoaded: boolean = false;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public async init() {
    if (this.isLoaded) return;

    try {
      for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
        try {
          const { sound } = await Audio.Sound.createAsync(asset);
          this.sounds.set(key as SoundEffect, sound);
        } catch (err) {
          console.warn(`Could not load sound ${key}:`, err);
        }
      }

      this.isLoaded = true;
    } catch (e) {
      console.warn("Failed to load sounds", e);
    }
  }

  public async play(effect: SoundEffect) {
    if (!this.enabled || !this.isLoaded) return;

    const sound = this.sounds.get(effect);
    if (sound) {
      try {
        await sound.replayAsync();
      } catch (e) {
        // Fallback for sounds that might be stuck or not loaded
        await sound.stopAsync();
        await sound.playAsync();
      }
    }
  }

  public async unload() {
    for (const sound of this.sounds.values()) {
      await sound.unloadAsync();
    }
    this.sounds.clear();
    this.isLoaded = false;
  }
}

export const soundManager = new SoundManager();
