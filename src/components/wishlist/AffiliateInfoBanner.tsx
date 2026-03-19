import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Clipboard,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { AFFILIATE_INFO } from "@packages/wishlist";
import { TText } from "@/src/components/tamagui";
import { TCard } from "@/src/components/tamagui";

interface Props {
  theme: ThemeColors;
}

export function AffiliateInfoBanner({ theme }: Props) {
  const [expanded, setExpanded] = useState(false);

  const copyAmazonTag = () => {
    Clipboard.setString(AFFILIATE_INFO.amazon.tag);
    Alert.alert("Copiado!", `Tag Amazon "${AFFILIATE_INFO.amazon.tag}" copiada.`);
  };

  const openAmazonLink = () => {
    Linking.openURL(`https://www.amazon.com.br?tag=${AFFILIATE_INFO.amazon.tag}`);
  };

  const copyMlId = () => {
    Clipboard.setString(AFFILIATE_INFO.mercadolivre.id);
    Alert.alert(
      "Copiado!",
      `ID ${AFFILIATE_INFO.mercadolivre.id} copiado. Cole no buscador do Mercado Livre.`,
    );
  };

  const openMlLink = () => {
    Linking.openURL(AFFILIATE_INFO.mercadolivre.link);
  };

  return (
    <TCard
      compact
      marginHorizontal={16}
      marginVertical={6}
      backgroundColor={theme.cardBackground}
      borderColor={theme.primaryColor + "30"}
      overflow="hidden"
    >
      <TouchableOpacity
        style={s.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <Feather name="heart" size={14} color={theme.primaryColor} />
          <TText variant="label" fontWeight="600" color={theme.primaryColor}>
            Apoie o DOMUS — Links Patrocinados
          </TText>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.secondaryText}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={s.body}>
          <TText variant="caption" color={theme.secondaryText} lineHeight={18}>
            Ao comprar pelos links abaixo, voce apoia o DOMUS sem nenhum custo
            adicional. Os links sao automaticamente convertidos quando voce
            adiciona produtos da Amazon ou Mercado Livre.
          </TText>

          {/* Amazon */}
          <View style={[s.platform, { backgroundColor: theme.background === "#F4F6F8" || theme.background === "#FAFAF9" || theme.background === "#F0FDF4" || theme.background === "#F5F7FA" ? "#FF990015" : "#FF990030" }]}>
            <View style={s.platformHeader}>
              <TText variant="label" bold color={theme.textColor}>Amazon</TText>
              <View style={s.sponsoredBadge}>
                <TText variant="caption" bold color="#fff" fontSize={9} textTransform="uppercase" letterSpacing={0.5}>
                  Patrocinado
                </TText>
              </View>
            </View>
            <TText variant="caption" color={theme.secondaryText} lineHeight={16} fontSize={11}>
              {AFFILIATE_INFO.amazon.description}
            </TText>
            <TText variant="caption" color={theme.secondaryText} lineHeight={16} fontSize={11}>
              Tag: <TText variant="caption" fontWeight="600" color={theme.textColor} fontSize={11}>{AFFILIATE_INFO.amazon.tag}</TText>
            </TText>
            <View style={s.mlActions}>
              <TouchableOpacity
                style={[s.mlBtn, { borderColor: "#FF9900" }]}
                onPress={copyAmazonTag}
                activeOpacity={0.7}
              >
                <Feather name="copy" size={12} color="#FF9900" />
                <TText variant="caption" fontWeight="600" color="#FF9900" fontSize={11}>
                  Copiar tag
                </TText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.mlBtn, { borderColor: "#FF9900", backgroundColor: "#FF9900" }]}
                onPress={openAmazonLink}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={12} color="#fff" />
                <TText variant="caption" fontWeight="600" color="#fff" fontSize={11}>
                  Abrir Amazon
                </TText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mercado Livre */}
          <View style={[s.platform, { backgroundColor: theme.background === "#F4F6F8" || theme.background === "#FAFAF9" || theme.background === "#F0FDF4" || theme.background === "#F5F7FA" ? "#FFE60020" : "#FFE60040" }]}>
            <View style={s.platformHeader}>
              <TText variant="label" bold color={theme.textColor}>Mercado Livre</TText>
              <View style={s.sponsoredBadge}>
                <TText variant="caption" bold color="#fff" fontSize={9} textTransform="uppercase" letterSpacing={0.5}>
                  Patrocinado
                </TText>
              </View>
            </View>
            <TText variant="caption" color={theme.secondaryText} lineHeight={16} fontSize={11}>
              {AFFILIATE_INFO.mercadolivre.description}
            </TText>

            <View style={s.mlActions}>
              <TouchableOpacity
                style={[s.mlBtn, { borderColor: theme.primaryColor }]}
                onPress={copyMlId}
                activeOpacity={0.7}
              >
                <Feather name="copy" size={12} color={theme.primaryColor} />
                <TText variant="caption" fontWeight="600" color={theme.primaryColor} fontSize={11}>
                  {AFFILIATE_INFO.mercadolivre.id}
                </TText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.mlBtn, { borderColor: theme.primaryColor, backgroundColor: theme.primaryColor }]}
                onPress={openMlLink}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={12} color="#fff" />
                <TText variant="caption" fontWeight="600" color="#fff" fontSize={11}>
                  Abrir Link
                </TText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </TCard>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  body: { paddingTop: 10, gap: 10 },
  platform: {
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  platformHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sponsoredBadge: {
    backgroundColor: "#22C55E",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mlActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  mlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
