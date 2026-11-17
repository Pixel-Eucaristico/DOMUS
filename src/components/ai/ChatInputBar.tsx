import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { ChatActionMenu } from "./ChatActionMenu";
import type { ChatAction } from "./ChatActionMenu";

// ─── Constants ───────────────────────────────────────────────────────────────

const BTN_SIZE = 38;
const BTN_RADIUS = BTN_SIZE / 2;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatInputBarProps {
  text: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  isEnabled: boolean;
  voiceEnabled: boolean;
  visionOCREnabled?: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  isLoading: boolean;
  pulseAnim: Animated.Value;
  onVoicePress: () => void;
  onAction: (action: ChatAction) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatInputBar({
  text,
  onChangeText,
  onSend,
  isEnabled,
  voiceEnabled,
  visionOCREnabled,
  isRecording,
  isTranscribing,
  isLoading,
  pulseAnim,
  onVoicePress,
  onAction,
}: ChatInputBarProps) {
  const { theme } = useAppState();

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
      {/* ── Input row: [+] [input] [mic] [send] ── */}
      <View style={s.inputRow}>
        {isEnabled && (
          <ChatActionMenu onAction={onAction} visionOCREnabled={visionOCREnabled} />
        )}

        <TextInput
          style={[s.input, {
            color: theme.textColor,
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          }]}
          value={text}
          onChangeText={onChangeText}
          placeholder="Pergunte sobre suas finanças..."
          placeholderTextColor={theme.secondaryText}
          multiline
          maxLength={2000}
        />

        {voiceEnabled && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={() => { soundManager.play("tap"); onVoicePress(); }}
              disabled={isLoading || isTranscribing}
              style={[s.circleBtn, {
                backgroundColor: isRecording ? "#e53935" : isTranscribing ? theme.border : theme.cardBackground,
                borderColor: isRecording ? "#e53935" : theme.border,
              }]}
            >
              {isTranscribing ? (
                <ActivityIndicator size={16} color={theme.secondaryText} />
              ) : (
                <Feather
                  name={isRecording ? "mic-off" : "mic"}
                  size={18}
                  color={isRecording ? "#fff" : theme.secondaryText}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || isLoading}
          style={[s.circleBtn, {
            backgroundColor: text.trim() ? theme.primaryColor : theme.border,
            borderColor: text.trim() ? theme.primaryColor : theme.border,
          }]}
        >
          <Feather name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BTN_RADIUS,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
    minHeight: BTN_SIZE,
  },
  circleBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_RADIUS,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
