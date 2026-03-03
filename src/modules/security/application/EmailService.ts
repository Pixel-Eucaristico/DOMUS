import { Linking, Alert } from "react-native";
import type { DeviceInfo } from "../infrastructure/DeviceInfoService";

const SUPPORT_EMAIL = "williancustodioquintino+domus@gmail.com";

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export class EmailService {
  static buildMailtoUrl(
    form: ContactFormData,
    deviceInfo: DeviceInfo,
  ): string {
    const subject = encodeURIComponent(`[DOMUS] ${form.subject}`);
    const timestamp = new Date().toLocaleString("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const body = encodeURIComponent(
      `Nome: ${form.name}\n` +
        `E-mail: ${form.email}\n\n` +
        `Mensagem:\n${form.message}\n\n` +
        `--- Informações do dispositivo ---\n` +
        `Plataforma: ${deviceInfo.platform}\n` +
        `Versão SO: ${deviceInfo.osVersion}\n` +
        `Versão App: ${deviceInfo.appVersion}\n` +
        `Dispositivo: ${deviceInfo.deviceName}\n` +
        `Data/Hora: ${timestamp}`,
    );
    return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  static async open(
    form: ContactFormData,
    deviceInfo: DeviceInfo,
  ): Promise<void> {
    const url = EmailService.buildMailtoUrl(form, deviceInfo);
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(
        "Cliente de e-mail não encontrado",
        `Nenhum aplicativo de e-mail instalado.\nEnvie manualmente para:\n${SUPPORT_EMAIL}`,
        [{ text: "OK" }],
      );
      return;
    }
    await Linking.openURL(url);
  }
}
