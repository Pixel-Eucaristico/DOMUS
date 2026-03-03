import { Audio } from "expo-av";

export type SoundEffect = "tap" | "success" | "error" | "trash" | "pop" | "levelUp";

const SOUND_ASSETS: Record<SoundEffect, any> = {
  tap: require("../../assets/sounds/tap.mp3"),
  success: require("../../assets/sounds/success.mp3"),
  error: require("../../assets/sounds/error.mp3"),
  trash: require("../../assets/sounds/trash.mp3"),
  pop: require("../../assets/sounds/pop.mp3"),
  levelUp: require("../../assets/sounds/level-up.mp3"),
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
