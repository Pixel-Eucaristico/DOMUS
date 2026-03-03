import Constants from "expo-constants";
import { Platform } from "react-native";

export interface DeviceInfo {
  platform: string;
  osVersion: string;
  appVersion: string;
  deviceName: string;
}

export class DeviceInfoService {
  static get(): DeviceInfo {
    return {
      platform: Platform.OS,
      osVersion: String(Platform.Version ?? "desconhecido"),
      appVersion: Constants.expoConfig?.version ?? "1.0.0",
      deviceName: Constants.deviceName ?? "dispositivo desconhecido",
    };
  }

  static formatForEmail(): string {
    const d = DeviceInfoService.get();
    return [
      `Plataforma: ${d.platform}`,
      `Versão SO: ${d.osVersion}`,
      `Versão App: ${d.appVersion}`,
      `Dispositivo: ${d.deviceName}`,
    ].join("\n");
  }
}
