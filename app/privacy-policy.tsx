import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";

const LAST_UPDATED = "Março de 2026";
const EXTERNAL_POLICY_URL =
  "https://github.com/WillianQuintino/domus-privacy-policy";

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

export default function PrivacyPolicyScreen() {
  const { theme } = useAppState();
  const s = styles(theme);

  return (
    <SafeAreaView
      style={[s.safe, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View
        style={[
          s.header,
          { borderBottomColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.textColor }]}>
          Política de Privacidade
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Last updated */}
        <View
          style={[
            s.badge,
            { backgroundColor: `${theme.primaryColor}15`, borderColor: `${theme.primaryColor}30` },
          ]}
        >
          <Feather name="calendar" size={13} color={theme.primaryColor} />
          <Text style={[s.badgeText, { color: theme.primaryColor }]}>
            Última atualização: {LAST_UPDATED}
          </Text>
        </View>

        {/* Intro */}
        <Text style={[s.intro, { color: theme.secondaryText }]}>
          O DOMUS foi desenvolvido com privacidade como princípio central. Todos os
          seus dados financeiros permanecem exclusivamente no seu dispositivo. Não
          temos servidores que armazenem suas informações pessoais.
        </Text>

        {/* Section 1 */}
        <PolicySection
          icon="database"
          title="Dados Coletados"
          theme={theme}
        >
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Transações financeiras:</BoldText>
            {" "}Armazenadas localmente no SQLite do seu dispositivo. Nunca
            transmitidas para servidores externos.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>ID de dispositivo:</BoldText>
            {" "}Gerado localmente e usado apenas para sincronização P2P opcional
            entre seus próprios dispositivos. Não é enviado a nenhum servidor.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Preferências do aplicativo:</BoldText>
            {" "}Tema, configurações de segurança e preferências de IA são
            armazenadas localmente no dispositivo.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Não coletamos:</BoldText>
            {" "}CPF, RG, nome completo, e-mail, endereço, número de cartão,
            dados bancários ou qualquer identificador pessoal.
          </PolicyItem>
        </PolicySection>

        {/* Section 2 */}
        <PolicySection
          icon="cpu"
          title="Inteligência Artificial"
          theme={theme}
        >
          <PolicyItem theme={theme}>
            O DOMUS oferece análises financeiras via IA (OpenAI, Google Gemini ou
            Anthropic Claude). Ao usar este recurso, apenas{" "}
            <BoldText theme={theme}>métricas financeiras agregadas</BoldText> são
            enviadas diretamente do seu dispositivo para o provedor escolhido.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>O que é enviado:</BoldText>
            {" "}Saldo total, média de receitas e despesas, score de perfil
            financeiro, tendência de gastos (ex: "+12%"). Sem nomes, CPF,
            números de conta ou identificadores pessoais.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Chaves de API:</BoldText>
            {" "}Armazenadas criptografadas no Keystore do Android / Secure
            Enclave do iOS via{" "}
            <BoldText theme={theme}>expo-secure-store</BoldText>. Nunca são
            transmitidas para servidores do DOMUS.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Comunicação direta:</BoldText>
            {" "}Todas as chamadas de IA saem do seu dispositivo diretamente para
            o provedor. O DOMUS não atua como intermediário.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Disclaimer:</BoldText>
            {" "}As análises geradas pela IA são meramente informativas e não
            constituem aconselhamento financeiro profissional.
          </PolicyItem>
        </PolicySection>

        {/* Section 3 */}
        <PolicySection
          icon="camera"
          title="Câmera e Galeria"
          theme={theme}
        >
          <PolicyItem theme={theme}>
            A câmera é usada exclusivamente para:
          </PolicyItem>
          <PolicyItem theme={theme}>• Escanear QR Codes de notas fiscais eletrônicas (NF-e)</PolicyItem>
          <PolicyItem theme={theme}>• Capturar fotos de cupons fiscais para OCR (reconhecimento de texto)</PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Imagens não são armazenadas</BoldText> permanentemente
            nem transmitidas para servidores do DOMUS. O processamento OCR pode
            usar uma API de terceiros configurada pelo usuário — neste caso, a
            imagem é enviada diretamente ao serviço configurado.
          </PolicyItem>
        </PolicySection>

        {/* Section 4 */}
        <PolicySection
          icon="lock"
          title="Biometria e PIN"
          theme={theme}
        >
          <PolicyItem theme={theme}>
            O recurso de bloqueio do app usa as APIs nativas de autenticação do
            sistema operacional.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Biometria:</BoldText>
            {" "}Impressão digital e Face ID são processados exclusivamente pelo
            sistema operacional. O DOMUS nunca acessa ou armazena dados
            biométricos.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>PIN:</BoldText>
            {" "}Armazenado apenas como hash SHA-256 com salt único, via
            expo-secure-store. Nunca em texto simples.
          </PolicyItem>
        </PolicySection>

        {/* Section 5 */}
        <PolicySection
          icon="download"
          title="Backup"
          theme={theme}
        >
          <PolicyItem theme={theme}>
            O backup é gerado localmente e cifrado com{" "}
            <BoldText theme={theme}>AES-256-GCM</BoldText> usando a senha
            definida pelo usuário (derivação PBKDF2-SHA256 com 100.000
            iterações).
          </PolicyItem>
          <PolicyItem theme={theme}>
            O DOMUS não tem acesso à senha do backup nem ao conteúdo do arquivo
            gerado. O arquivo é compartilhado com o aplicativo de sua escolha
            (e-mail, nuvem pessoal, etc.) — o DOMUS não escolhe o destino.
          </PolicyItem>
        </PolicySection>

        {/* Section 6 */}
        <PolicySection
          icon="wifi"
          title="Rede e Segurança"
          theme={theme}
        >
          <PolicyItem theme={theme}>
            O app bloqueia tráfego HTTP não cifrado por padrão. Toda comunicação
            de rede usa <BoldText theme={theme}>HTTPS</BoldText>.
          </PolicyItem>
          <PolicyItem theme={theme}>
            A sincronização P2P (opcional) ocorre diretamente entre dispositivos
            via WebRTC, sem passar por servidores centrais.
          </PolicyItem>
        </PolicySection>

        {/* Section 7 */}
        <PolicySection
          icon="user-x"
          title="Seus Direitos"
          theme={theme}
        >
          <PolicyItem theme={theme}>
            Como todos os dados estão no seu dispositivo, você tem controle total:
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Excluir todos os dados:</BoldText> Desinstale
            o aplicativo ou use a função de restaurar backup com arquivo vazio.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Exportar dados:</BoldText> Use a função
            de Backup para exportar todos os seus dados.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Remover chaves de IA:</BoldText> Acesse
            Configurações → IA → Gerenciar chaves.
          </PolicyItem>
        </PolicySection>

        {/* Section 8 */}
        <PolicySection
          icon="info"
          title="Contato"
          theme={theme}
        >
          <PolicyItem theme={theme}>
            Dúvidas sobre esta política? Entre em contato:
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>E-mail:</BoldText>
            {" "}williancustodioquintino+domus@gmail.com
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Empresa:</BoldText>
            {" "}Pixel Eucarístico (CNPJ 55.075.291/0001-79)
          </PolicyItem>
        </PolicySection>

        {/* External link */}
        <TouchableOpacity
          style={[
            s.externalLink,
            { borderColor: theme.border, backgroundColor: theme.cardBackground },
          ]}
          onPress={() => safeOpenUrl(EXTERNAL_POLICY_URL)}
          accessibilityLabel="Ver política de privacidade completa online"
          accessibilityRole="link"
        >
          <Feather name="external-link" size={16} color={theme.primaryColor} />
          <Text style={[s.externalLinkText, { color: theme.primaryColor }]}>
            Ver política completa online
          </Text>
        </TouchableOpacity>

        <Text style={[s.footer, { color: theme.secondaryText }]}>
          DOMUS · Pixel Eucarístico · {LAST_UPDATED}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PolicySection({
  icon,
  title,
  theme,
  children,
}: {
  icon: string;
  title: string;
  theme: any;
  children: React.ReactNode;
}) {
  const s = styles(theme);
  return (
    <View
      style={[
        s.section,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={s.sectionHeader}>
        <View
          style={[
            s.sectionIconBg,
            { backgroundColor: `${theme.primaryColor}15` },
          ]}
        >
          <Feather name={icon as any} size={16} color={theme.primaryColor} />
        </View>
        <Text style={[s.sectionTitle, { color: theme.textColor }]}>{title}</Text>
      </View>
      <View
        style={[s.sectionDivider, { backgroundColor: theme.border }]}
      />
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function PolicyItem({
  theme,
  children,
}: {
  theme: any;
  children: React.ReactNode;
}) {
  const s = styles(theme);
  return (
    <Text
      style={[s.bodyText, { color: theme.secondaryText }]}
      accessibilityRole="text"
    >
      {children}
    </Text>
  );
}

function BoldText({ theme, children }: { theme: any; children: React.ReactNode }) {
  return (
    <Text style={{ fontFamily: "DMSans_700Bold", color: theme.textColor }}>
      {children}
    </Text>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function styles(theme: any) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontSize: 18,
      fontFamily: "DMSans_700Bold",
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 14,
      paddingBottom: 32,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
    },
    badgeText: {
      fontSize: 12,
      fontFamily: "DMSans_500Medium",
    },
    intro: {
      fontSize: 14,
      fontFamily: "DMSans_400Regular",
      lineHeight: 22,
    },
    section: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    sectionIconBg: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      fontSize: 15,
      fontFamily: "DMSans_700Bold",
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
    },
    sectionBody: {
      padding: 14,
      gap: 8,
    },
    bodyText: {
      fontSize: 13,
      fontFamily: "DMSans_400Regular",
      lineHeight: 20,
    },
    externalLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 4,
    },
    externalLinkText: {
      fontSize: 14,
      fontFamily: "DMSans_600SemiBold",
    },
    footer: {
      fontSize: 11,
      fontFamily: "DMSans_400Regular",
      textAlign: "center",
      marginTop: 4,
    },
  });
}
