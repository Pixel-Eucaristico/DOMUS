import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import type { ChatMessage } from "@packages/ai";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { theme } = useAppState();
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.wrapper,
        isUser ? styles.wrapperUser : styles.wrapperAssistant,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.primaryColor }
            : { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1 },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? "#fff" : theme.textColor },
          ]}
        >
          {message.content}
        </Text>

        {message.isLocalFallback && !isUser && (
          <Text style={[styles.badge, { color: theme.secondaryText }]}>
            análise local
          </Text>
        )}

        {message.tokensUsed != null && message.tokensUsed > 0 && (
          <Text style={[styles.tokens, { color: theme.secondaryText }]}>
            {message.tokensUsed} tokens
          </Text>
        )}
      </View>

      <Text style={[styles.time, { color: theme.secondaryText }]}>
        {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  wrapperUser: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  wrapperAssistant: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  badge: {
    fontSize: 10,
    marginTop: 4,
    fontStyle: "italic",
  },
  tokens: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "right",
  },
  time: {
    fontSize: 11,
    marginTop: 3,
    marginHorizontal: 4,
  },
});
