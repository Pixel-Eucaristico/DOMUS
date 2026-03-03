import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Clipboard,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ThemeColors } from "@packages/theme";
import { AFFILIATE_INFO } from "@packages/wishlist";

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
    <View
      style={[styles.container, { backgroundColor: theme.cardBackground, borderColor: theme.primaryColor + "30" }]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Feather name="heart" size={14} color={theme.primaryColor} />
          <Text style={[styles.headerTitle, { color: theme.primaryColor }]}>
            Apoie o DOMUS — Links Patrocinados
          </Text>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.secondaryText}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          <Text style={[styles.intro, { color: theme.secondaryText }]}>
            Ao comprar pelos links abaixo, você apoia o DOMUS sem nenhum custo
            adicional. Os links são automaticamente convertidos quando você
            adiciona produtos da Amazon ou Mercado Livre.
          </Text>

          {/* Amazon */}
          <View style={[styles.platform, { backgroundColor: theme.background === "#F4F6F8" || theme.background === "#FAFAF9" || theme.background === "#F0FDF4" || theme.background === "#F5F7FA" ? "#FF990015" : "#FF990030" }]}>
            <View style={styles.platformHeader}>
              <Text style={[styles.platformName, { color: theme.textColor }]}>Amazon</Text>
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>Patrocinado</Text>
              </View>
            </View>
            <Text style={[styles.platformDesc, { color: theme.secondaryText }]}>
              {AFFILIATE_INFO.amazon.description}
            </Text>
            <Text style={[styles.platformDesc, { color: theme.secondaryText }]}>
              Tag: <Text style={[styles.tagValue, { color: theme.textColor }]}>{AFFILIATE_INFO.amazon.tag}</Text>
            </Text>
            <View style={styles.mlActions}>
              <TouchableOpacity
                style={[styles.mlBtn, { borderColor: "#FF9900" }]}
                onPress={copyAmazonTag}
                activeOpacity={0.7}
              >
                <Feather name="copy" size={12} color="#FF9900" />
                <Text style={[styles.mlBtnText, { color: "#FF9900" }]}>
                  Copiar tag
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mlBtn, { borderColor: "#FF9900", backgroundColor: "#FF9900" }]}
                onPress={openAmazonLink}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={12} color="#fff" />
                <Text style={[styles.mlBtnText, { color: "#fff" }]}>
                  Abrir Amazon
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mercado Livre */}
          <View style={[styles.platform, { backgroundColor: theme.background === "#F4F6F8" || theme.background === "#FAFAF9" || theme.background === "#F0FDF4" || theme.background === "#F5F7FA" ? "#FFE60020" : "#FFE60040" }]}>
            <View style={styles.platformHeader}>
              <Text style={[styles.platformName, { color: theme.textColor }]}>Mercado Livre</Text>
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>Patrocinado</Text>
              </View>
            </View>
            <Text style={[styles.platformDesc, { color: theme.secondaryText }]}>
              {AFFILIATE_INFO.mercadolivre.description}
            </Text>

            <View style={styles.mlActions}>
              <TouchableOpacity
                style={[styles.mlBtn, { borderColor: theme.primaryColor }]}
                onPress={copyMlId}
                activeOpacity={0.7}
              >
                <Feather name="copy" size={12} color={theme.primaryColor} />
                <Text style={[styles.mlBtnText, { color: theme.primaryColor }]}>
                  {AFFILIATE_INFO.mercadolivre.id}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mlBtn, { borderColor: theme.primaryColor, backgroundColor: theme.primaryColor }]}
                onPress={openMlLink}
                activeOpacity={0.7}
              >
                <Feather name="external-link" size={12} color="#fff" />
                <Text style={[styles.mlBtnText, { color: "#fff" }]}>
                  Abrir Link
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
  },
  body: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  intro: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    lineHeight: 18,
  },
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
  platformName: {
    fontSize: 13,
    fontFamily: "DMSans_700Bold",
  },
  sponsoredBadge: {
    backgroundColor: "#22C55E",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sponsoredText: {
    fontSize: 9,
    fontFamily: "DMSans_700Bold",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  platformDesc: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    lineHeight: 16,
  },
  tagValue: { fontFamily: "DMSans_600SemiBold" },
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
  mlBtnText: {
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
  },
});
