import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Linking,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import { ClipboardService } from "@/src/modules/security/application/ClipboardService";
import { buildPixPayload } from "@packages/domain/src/pixPayload";
import { soundManager } from "@/src/services/SoundManager";

const PIX_KEY = "55.075.291/0001-79";
const PIX_PAYLOAD = buildPixPayload(PIX_KEY);
const KOFI_URL = "https://ko-fi.com/willianquintino33618";
const LINKEDIN_URL = "https://www.linkedin.com/in/willian-custodio-quintino";
const GITHUB_URL = "https://github.com/WillianQuintino";

async function safeOpenUrl(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Erro", "Não foi possível abrir este link.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Erro", "Não foi possível abrir este link.");
  }
}

interface DonationSectionProps {
  theme: any;
}

export function DonationSection({ theme }: DonationSectionProps) {
  const [pixCopied, setPixCopied] = useState(false);

  const handleCopyPix = useCallback(async () => {
    soundManager.play("success");
    const ok = await ClipboardService.copy(PIX_KEY);
    if (ok) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2500);
    }
  }, []);

  return (
    <>
      {/* PIX */}
      <View style={s.pixBlock}>
        <View style={s.pixRow}>
          <View style={s.pixInfo}>
            <Text style={[s.pixLabel, { color: theme.secondaryText }]}>
              Chave PIX (CNPJ)
            </Text>
            <Text style={[s.pixKey, { color: theme.textColor }]} selectable>
              {PIX_KEY}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              s.copyBtn,
              { backgroundColor: pixCopied ? theme.success : theme.primaryColor },
            ]}
            onPress={handleCopyPix}
            activeOpacity={0.8}
          >
            <Feather name={pixCopied ? "check" : "copy"} size={15} color="#fff" />
            <Text style={s.copyBtnText}>
              {pixCopied ? "Copiado!" : "Copiar"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={s.qrContainer}>
          <QRCode
            value={PIX_PAYLOAD}
            size={160}
            color={theme.textColor}
            backgroundColor={theme.cardBackground}
          />
          <Text style={[s.qrHint, { color: theme.secondaryText }]}>
            Escaneie com seu banco
          </Text>
        </View>
      </View>

      <View style={[s.divider, { backgroundColor: theme.border }]} />

      <LinkRow
        icon="coffee"
        label="Ko-fi"
        description="Apoie com um café"
        color="#FF5E5B"
        theme={theme}
        onPress={() => safeOpenUrl(KOFI_URL)}
      />
      <LinkRow
        icon="linkedin"
        label="LinkedIn"
        description="Willian Custodio Quintino"
        color="#0A66C2"
        theme={theme}
        onPress={() => safeOpenUrl(LINKEDIN_URL)}
      />
      <LinkRow
        icon="github"
        label="GitHub"
        description="WillianQuintino"
        color={theme.textColor}
        theme={theme}
        onPress={() => safeOpenUrl(GITHUB_URL)}
      />
    </>
  );
}

// ── LinkRow (reusable, exported for about.tsx) ─────────────────────────────────

export function LinkRow({
  icon,
  label,
  description,
  color,
  theme,
  onPress,
  targetRef,
  tourCard,
  disabled = false,
}: {
  icon: string;
  label: string;
  description: string;
  color: string;
  theme: any;
  onPress: () => void;
  targetRef?: any;
  tourCard?: React.ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <Pressable
      ref={targetRef}
      collapsable={false}
      style={({ pressed }) => [linkStyles.row, pressed && !disabled && { opacity: 0.6 }]}
      onPress={() => { if (disabled) return; soundManager.play("tap"); onPress(); }}
    >
      <View style={[linkStyles.iconBg, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <View style={linkStyles.texts}>
        <Text style={[linkStyles.label, { color: theme.textColor }]}>
          {label}
        </Text>
        <Text style={[linkStyles.description, { color: theme.secondaryText }]}>
          {description}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={theme.secondaryText} />
    </Pressable>
  );

  if (tourCard) {
    return (
      <View style={Platform.OS === "web" ? { position: "relative" } : {}}>
        {content}
        {tourCard}
      </View>
    );
  }

  return content;
}

const linkStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  texts: { flex: 1 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  description: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
});

const s = StyleSheet.create({
  pixBlock: { gap: 14 },
  pixRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pixInfo: { flex: 1 },
  pixLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, marginBottom: 2 },
  pixKey: { fontFamily: "DMSans_700Bold", fontSize: 15, letterSpacing: 0.4 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
  },
  copyBtnText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: "#fff" },
  qrContainer: { alignItems: "center", gap: 8, paddingVertical: 2 },
  qrHint: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth },
});
