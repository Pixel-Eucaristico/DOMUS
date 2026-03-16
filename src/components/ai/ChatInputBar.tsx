import React, { useState } from "react";
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
  onSend: () => void;
  // Feature flags
  isEnabled: boolean;
  voiceEnabled: boolean;
  visionOCREnabled?: boolean;
  // Voice state
  isRecording: boolean;
  isTranscribing: boolean;
  isLoading: boolean;
  pulseAnim: Animated.Value;
  onVoicePress: () => void;
  // Actions
  onAction: (action: ChatAction) => void;
}

// ─── MD Format Buttons ───────────────────────────────────────────────────────

interface FormatBtn {
  icon: keyof typeof Feather.glyphMap;
  wrap: string;
  label: string;
}

const MD_BUTTONS: FormatBtn[] = [
  { icon: "bold", wrap: "**", label: "Negrito" },
  { icon: "italic", wrap: "_", label: "Italico" },
  { icon: "code", wrap: "`", label: "Codigo" },
  { icon: "list", wrap: "- ", label: "Lista" },
  { icon: "minus", wrap: "\n---\n", label: "Linha" },
];

function insertMarkdown(
  text: string,
  selStart: number,
  selEnd: number,
  wrapper: string,
): string {
  const isSingle = wrapper === "- " || wrapper.includes("---");
  const selected = text.slice(selStart, selEnd);

  if (isSingle) {
    return text.slice(0, selStart) + wrapper + text.slice(selEnd);
  }
  if (selected) {
    return text.slice(0, selStart) + wrapper + selected + wrapper + text.slice(selEnd);
  }
  return text.slice(0, selStart) + wrapper + wrapper + text.slice(selEnd);
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
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const handleFormat = (wrapper: string) => {
    soundManager.play("tap");
    const newText = insertMarkdown(text, selection.start, selection.end, wrapper);
    onChangeText(newText);
  };

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSend();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
      {/* ── MD formatting bar ── */}
      <View style={[styles.mdBar, { borderBottomColor: theme.border }]}>
        {MD_BUTTONS.map((btn) => (
          <TouchableOpacity
            key={btn.label}
            onPress={() => handleFormat(btn.wrap)}
            style={[styles.mdBtn, { backgroundColor: `${theme.primaryColor}08` }]}
            accessibilityLabel={btn.label}
          >
            <Feather name={btn.icon} size={14} color={theme.primaryColor} />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Input row: [+] [input] [mic] [send] ── */}
      <View style={styles.inputRow}>
        {/* + button */}
        {isEnabled && (
          <ChatActionMenu onAction={onAction} visionOCREnabled={visionOCREnabled} />
        )}

        {/* Text input */}
        <TextInput
          style={[styles.input, {
            color: theme.textColor,
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          }]}
          value={text}
          onChangeText={onChangeText}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          placeholder="Pergunte sobre suas financas..."
          placeholderTextColor={theme.secondaryText}
          multiline
          maxLength={2000}
        />

        {/* Mic button */}
        {voiceEnabled && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={() => { soundManager.play("tap"); onVoicePress(); }}
              disabled={isLoading || isTranscribing}
              style={[styles.circleBtn, {
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

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || isLoading}
          style={[styles.circleBtn, {
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

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mdBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mdBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
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
