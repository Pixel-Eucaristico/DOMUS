import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { TextStyle } from "react-native";
import { useAppState } from "@/src/context/AppStateProvider";
import type { ChatMessage } from "@packages/ai";

interface ChatBubbleProps {
  message: ChatMessage;
}

// ─── Lightweight Markdown Renderer ───────────────────────────────────────────

interface MdSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

interface MdLine {
  type: "text" | "bullet" | "h3";
  segments: MdSegment[];
}

function parseMarkdown(raw: string): MdLine[] {
  const lines = raw.split("\n");
  const result: MdLine[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();

    let type: MdLine["type"] = "text";
    let content = trimmed;

    if (trimmed.startsWith("### ")) {
      type = "h3";
      content = trimmed.slice(4);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      type = "bullet";
      content = trimmed.slice(2);
    }

    const segments = parseInline(content);
    result.push({ type, segments });
  }
  return result;
}

function parseInline(text: string): MdSegment[] {
  const segments: MdSegment[] = [];
  // Match **bold**, *italic*, _italic_, __bold__
  const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // **bold** or __bold__
      segments.push({ text: match[2]!, bold: true });
    } else if (match[3]) {
      // *italic* or _italic_
      segments.push({ text: match[4]!, italic: true });
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ text });
  }

  return segments;
}

export function MarkdownText({
  content,
  baseColor,
  isUser,
}: {
  content: string;
  baseColor: string;
  isUser: boolean;
}) {
  const lines = useMemo(() => parseMarkdown(content), [content]);

  return (
    <View style={mdStyles.container}>
      {lines.map((line, i) => {
        const textStyle: TextStyle = {
          color: baseColor,
          fontSize: line.type === "h3" ? 16 : 15,
          fontWeight: line.type === "h3" ? "700" : "400",
          lineHeight: line.type === "h3" ? 24 : 22,
        };

        if (line.type === "bullet") {
          return (
            <View key={i} style={mdStyles.bulletRow}>
              <Text style={[textStyle, mdStyles.bulletDot]}>{"  \u2022  "}</Text>
              <Text style={[textStyle, { flex: 1 }]}>
                {renderSegments(line.segments, baseColor)}
              </Text>
            </View>
          );
        }

        // Empty line = spacer
        if (line.segments.length === 1 && line.segments[0]!.text.trim() === "") {
          return <View key={i} style={mdStyles.spacer} />;
        }

        return (
          <Text key={i} style={textStyle}>
            {renderSegments(line.segments, baseColor)}
          </Text>
        );
      })}
    </View>
  );
}

function renderSegments(segments: MdSegment[], baseColor: string) {
  return segments.map((seg, j) => {
    const style: TextStyle = { color: baseColor };
    if (seg.bold) style.fontWeight = "700";
    if (seg.italic) style.fontStyle = "italic";
    return (
      <Text key={j} style={style}>
        {seg.text}
      </Text>
    );
  });
}

const mdStyles = StyleSheet.create({
  container: {
    gap: 2,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletDot: {
    lineHeight: 22,
  },
  spacer: {
    height: 8,
  },
});

// ─── ChatBubble ──────────────────────────────────────────────────────────────

export function ChatBubble({ message }: ChatBubbleProps) {
  const { theme } = useAppState();
  const isUser = message.role === "user";
  const textColor = isUser ? "#fff" : theme.textColor;

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
        {isUser ? (
          <Text style={[styles.text, { color: textColor }]}>
            {message.content}
          </Text>
        ) : (
          <MarkdownText
            content={message.content}
            baseColor={textColor}
            isUser={false}
          />
        )}

        {message.isLocalFallback && !isUser && (
          <Text style={[styles.badge, { color: theme.secondaryText }]}>
            analise local
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
    maxWidth: "85%",
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
