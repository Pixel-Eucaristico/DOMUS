import React, { useRef, useCallback } from "react";
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
import type { ChatMessage } from "@packages/ai";
import { useState } from "react";

export default function AIChatScreen() {
  const { theme } = useAppState();
  const { settings } = useAISettings();
  const { messages, isLoading, sendMessage, clearHistory } = useAIConsultant(settings);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, isLoading, sendMessage]);

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
          accessibilityLabel="Configurações de IA"
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
              Configurações
            </Text>{" "}
            para ativar a IA. Análise local disponível.
          </Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={48} color={theme.border} />
              <Text style={[styles.emptyTitle, { color: theme.textColor }]}>
                Olá! Sou o DOMUS
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                Pergunte sobre seus gastos, faça análises mensais ou peça
                conselho antes de uma compra.
              </Text>
            </View>
          }
          ListFooterComponent={isLoading ? <TypingIndicator /> : null}
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
            placeholder="Pergunte algo sobre suas finanças…"
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
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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
