import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { TText } from "@/src/components/tamagui";

interface MarkdownToolbarProps {
  onInsert: (wrapper: string) => void;
  onClose: () => void;
}

interface FormatOption {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  wrapper: string;
  preview: string;
}

const OPTIONS: FormatOption[] = [
  { icon: "bold", label: "Negrito", wrapper: "**", preview: "**texto**" },
  { icon: "italic", label: "Italico", wrapper: "_", preview: "_texto_" },
  { icon: "code", label: "Código", wrapper: "`", preview: "`código`" },
  { icon: "list", label: "Lista", wrapper: "- ", preview: "- item" },
  { icon: "minus", label: "Linha", wrapper: "\n---\n", preview: "---" },
];

export function MarkdownToolbar({ onInsert, onClose }: MarkdownToolbarProps) {
  const { theme } = useAppState();

  return (
    <View style={[s.container, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={s.options}>
        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            onPress={() => { soundManager.play("tap"); onInsert(opt.wrapper); }}
            style={[s.option, { backgroundColor: `${theme.primaryColor}10` }]}
            activeOpacity={0.6}
          >
            <Feather name={opt.icon} size={15} color={theme.primaryColor} />
            <TText bold variant="caption" color={theme.textColor}>{opt.label}</TText>
            <TText fontSize={10} fontFamily="monospace" color={theme.secondaryText}>{opt.preview}</TText>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onClose} style={s.closeBtn}>
        <Feather name="x" size={16} color={theme.secondaryText} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  options: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
