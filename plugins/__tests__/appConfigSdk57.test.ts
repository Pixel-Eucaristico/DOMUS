import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const { validateConfig } = require(
  path.join(ROOT, "node_modules/expo-build-properties/build/pluginConfig.js"),
) as {
  validateConfig: (config: Record<string, unknown>, projectRoot?: string) => unknown;
};
const { getAndroidSplashConfig } = require(
  path.join(ROOT, "node_modules/expo-splash-screen/plugin/build/getAndroidSplashConfig.js"),
) as {
  getAndroidSplashConfig: (props: Record<string, unknown>) => {
    backgroundColor: string;
    image?: string;
    imageWidth: number;
    dark?: { backgroundColor?: string; image?: string };
  };
};
const { getIosSplashConfig } = require(
  path.join(ROOT, "node_modules/expo-splash-screen/plugin/build/getIosSplashConfig.js"),
) as {
  getIosSplashConfig: (props: Record<string, unknown>) => {
    backgroundColor: string;
    image?: string;
    imageWidth: number;
    dark?: { backgroundColor?: string; image?: string };
  };
};

type PluginEntry = string | [string, Record<string, unknown>];

interface AppJson {
  expo: {
    splash?: unknown;
    plugins?: PluginEntry[];
  };
}

function findPluginOptions(plugins: PluginEntry[] | undefined, name: string): Record<string, unknown> {
  const entry = plugins?.find((p): p is [string, Record<string, unknown>] => Array.isArray(p) && p[0] === name);
  if (!entry) {
    throw new Error(`Plugin "${name}" não encontrado com opções em app.json`);
  }
  return entry[1];
}

describe("app.json — configuração nativa Expo SDK 57", () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8")) as AppJson;

  it("remove a chave legada expo.splash da raiz", () => {
    expect(appJson.expo.splash).toBeUndefined();
  });

  it("valida expo-build-properties com Android targetSdkVersion 36 e iOS deploymentTarget 16.4", () => {
    const buildProps = findPluginOptions(appJson.expo.plugins, "expo-build-properties") as {
      android?: { minSdkVersion?: number; compileSdkVersion?: number; targetSdkVersion?: number };
      ios?: { deploymentTarget?: string };
    };

    expect(() => validateConfig(buildProps, ROOT)).not.toThrow();
    expect(buildProps.android?.targetSdkVersion).toBe(36);
    expect(buildProps.ios?.deploymentTarget).toBe("16.4");
  });

  it("configura expo-splash-screen com cores light/dark, ícone e imageWidth 200 em Android e iOS", () => {
    const splashProps = findPluginOptions(appJson.expo.plugins, "expo-splash-screen");
    const androidSplash = getAndroidSplashConfig(splashProps);
    const iosSplash = getIosSplashConfig(splashProps);

    for (const splash of [androidSplash, iosSplash]) {
      expect(splash.backgroundColor).toBe("#F5F7FA");
      expect(splash.dark?.backgroundColor).toBe("#0F172A");
      expect(splash.image).toBe("./assets/images/splash-icon.png");
      expect(splash.dark?.image).toBe("./assets/images/splash-icon.png");
      expect(splash.imageWidth).toBe(200);
    }
  });
});
