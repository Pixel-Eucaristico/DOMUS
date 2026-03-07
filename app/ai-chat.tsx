import React, { useRef, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { useAIConsultant } from "@/src/hooks/useAIConsultant";
import { useAISettings } from "@/src/hooks/useAISettings";
import { ChatBubble } from "@/src/components/ai/ChatBubble";
import { TypingIndicator } from "@/src/components/ai/TypingIndicator";
import { AIUsageBar } from "@/src/components/ai/AIUsageBar";
import { DataPermissionModal } from "@/src/components/ai/DataPermissionModal";
import { detectMissingPermission } from "@/src/modules/ai/application/PermissionDetector";
import type { ChatMessage } from "@packages/ai";
import type { AIDataPermissions } from "@/src/modules/ai/domain/AISettings";

export default function AIChatScreen() {
  const { theme } = useAppState();
  const { settings, isLoading: settingsLoading, updateSettings } = useAISettings();
  const { messages, isLoading, sendMessage, generateWelcome, clearHistory } = useAIConsultant(settings);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // ─── Welcome message (AI-generated) ────────────────────────────────────────
  const [welcomeMsg, setWelcomeMsg] = useState<ChatMessage | null>(null);
  const welcomeGenerated = useRef(false);
  const [welcomeLoading, setWelcomeLoading] = useState(false);

  useEffect(() => {
    if (settingsLoading) return; // wait for settings to load from SecureStore
    if (welcomeGenerated.current || messages.length > 0) return;
    welcomeGenerated.current = true;
    setWelcomeLoading(true);

    generateWelcome()
      .then((msg) => {
        if (msg) setWelcomeMsg(msg);
      })
      .finally(() => setWelcomeLoading(false));
  }, [settingsLoading, generateWelcome, messages.length]);

  // Combined messages: welcome + real messages
  const displayMessages = useMemo(() => {
    if (messages.length > 0) return messages;
    if (welcomeMsg) return [welcomeMsg];
    return [];
  }, [messages, welcomeMsg]);

  // ─── Permission modal ──────────────────────────────────────────────────────
  const [permissionModal, setPermissionModal] = useState<{
    key: keyof AIDataPermissions;
    pendingText: string;
  } | null>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Check if the message needs a permission the user hasn't granted
    const missingPerm = detectMissingPermission(text, settings.dataPermissions);
    if (missingPerm) {
      setPermissionModal({ key: missingPerm, pendingText: text });
      return;
    }

    setInput("");
    await sendMessage(text);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, isLoading, sendMessage, settings.dataPermissions]);

  const handlePermissionAllow = useCallback(async () => {
    if (!permissionModal) return;
    const { key, pendingText } = permissionModal;
    setPermissionModal(null);

    // Grant permission
    await updateSettings({
      dataPermissions: {
        ...settings.dataPermissions,
        [key]: true,
      },
    });

    // Now send the message
    setInput("");
    await sendMessage(pendingText);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [permissionModal, updateSettings, settings.dataPermissions, sendMessage]);

  const handlePermissionDeny = useCallback(() => {
    if (!permissionModal) return;
    const { pendingText } = permissionModal;
    setPermissionModal(null);

    // Send anyway without the permission
    setInput("");
    sendMessage(pendingText);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [permissionModal, sendMessage]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <ChatBubble message={item} />,
    [],
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.textColor }]}>
            DOMUS IA
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
            Consultor financeiro
          </Text>
        </View>

        <TouchableOpacity
          onPress={clearHistory}
          style={styles.clearBtn}
          accessibilityLabel="Limpar conversa"
        >
          <Feather name="trash-2" size={18} color={theme.secondaryText} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/ai-settings")}
          style={styles.settingsBtn}
          accessibilityLabel="Configuracoes de IA"
        >
          <Feather name="settings" size={18} color={theme.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Offline / no-key banner */}
      {!settings.isEnabled && (
        <View
          style={[
            styles.banner,
            { backgroundColor: `${theme.warning}20`, borderColor: theme.warning },
          ]}
        >
          <Feather name="info" size={14} color={theme.warning} />
          <Text style={[styles.bannerText, { color: theme.warning }]}>
            Configure sua chave de API em{" "}
            <Text
              style={{ fontWeight: "700" }}
              onPress={() => router.push("/ai-settings")}
            >
              Configuracoes
            </Text>{" "}
            para ativar a IA. Analise local disponivel.
          </Text>
        </View>
      )}

      {/* Financial disclaimer */}
      <View
        style={[
          styles.disclaimer,
          { backgroundColor: `${theme.border}60`, borderColor: theme.border },
        ]}
        accessibilityRole="text"
      >
        <Feather name="alert-circle" size={12} color={theme.secondaryText} />
        <Text style={[styles.disclaimerText, { color: theme.secondaryText }]}>
          As analises sao meramente informativas e nao constituem
          aconselhamento financeiro profissional.
        </Text>
      </View>

      {/* Token usage bar */}
      <AIUsageBar refreshKey={messages.length} />

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={isLoading || welcomeLoading ? <TypingIndicator /> : null}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Pergunte algo sobre suas financas..."
            placeholderTextColor={theme.secondaryText}
            style={[
              styles.textInput,
              {
                color: theme.textColor,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  input.trim() && !isLoading
                    ? theme.primaryColor
                    : theme.border,
              },
            ]}
          >
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Permission request modal */}
      <DataPermissionModal
        visible={permissionModal !== null}
        permissionKey={permissionModal?.key ?? null}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
  },
  clearBtn: {
    padding: 6,
  },
  settingsBtn: {
    padding: 6,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
