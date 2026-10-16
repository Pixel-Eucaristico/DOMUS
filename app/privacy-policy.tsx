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
import { soundManager } from "@/src/services/SoundManager";
import { TCard, TText } from "@/src/components/tamagui";

const LAST_UPDATED = "Outubro de 2026";
const EXTERNAL_POLICY_URL =
  "https://pixel-eucaristico.com.br/domus/privacy";

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
          onPress={() => { soundManager.play("tap"); router.back(); }}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Feather name="arrow-left" size={22} color={theme.textColor} />
        </TouchableOpacity>
        <TText variant="subtitle" bold color={theme.textColor} fontSize={18} flex={1}>
          Política de Privacidade
        </TText>
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
        <TText variant="body" color={theme.secondaryText} lineHeight={22}>
          Esta política descreve o que o DOMUS faz hoje com os seus dados. O DOMUS
          não tem servidor próprio que receba seus dados: eles ficam no seu
          aparelho. Alguns recursos, quando você os usa ou ativa, enviam dados a
          serviços de terceiros. Cada um está descrito abaixo, com a condição em
          que acontece.
        </TText>

        {/* 1. Dados no aparelho */}
        <PolicySection icon="database" title="Dados no aparelho" theme={theme}>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Seus registros:</BoldText>
            {" "}transações, contas, orçamento, notas fiscais e lista de
            desejos ficam no banco de dados local do aparelho (SQLite). Esse banco
            não é cifrado pelo DOMUS; ele conta com a proteção do próprio sistema,
            que isola os dados de cada app. Na versão web, os dados ficam no
            armazenamento do navegador, sem cifra.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Segredos:</BoldText>
            {" "}chaves de API, o código do grupo de sincronização e o acesso ao
            Google Drive ficam no armazenamento seguro do sistema (Keystore no
            Android, Keychain no iOS). Na web, ficam cifrados com uma chave do
            próprio navegador. Exceções: a chave do Google Cloud Vision e a chave
            da cópia automática de backup ficam no armazenamento comum do app, sem
            cifra.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>PIN e biometria:</BoldText>
            {" "}o PIN é guardado só como hash PBKDF2-SHA256 (30 mil iterações) com
            salt aleatório, no armazenamento seguro; um PIN criado antes desta versão
            passa para esse formato no próximo desbloqueio por PIN. A biometria é processada pelo sistema; o DOMUS não acessa nem
            guarda dados biométricos.
          </PolicyItem>
          <PolicyItem theme={theme}>
            O DOMUS não pede CPF, RG, endereço, número de cartão nem dados
            bancários. Fotos de notas fiscais e holerites podem conter alguns desses
            dados (veja &quot;Câmera e fotos&quot;).
          </PolicyItem>
        </PolicySection>

        {/* 2. Sincronização */}
        <PolicySection icon="refresh-cw" title="Sincronização entre aparelhos (opcional)" theme={theme}>
          <PolicyItem theme={theme}>
            Fica desligada até você criar ou entrar num grupo com um código.
          </PolicyItem>
          <PolicyItem theme={theme}>
            Quando ligada, o app publica seus registros em seis{" "}
            <BoldText theme={theme}>relays Nostr públicos</BoldText>, mantidos por
            terceiros: relay.damus.io, nos.lol, relay.snort.social,
            relay.primal.net, relay.nostr.com.br e nostr.bitcoiner.social.
          </PolicyItem>
          <PolicyItem theme={theme}>
            O conteúdo vai cifrado com uma chave derivada do código do grupo. É uma
            proteção simples: quem souber o código, ou descobri-lo por tentativa,
            consegue ler os registros publicados.
          </PolicyItem>
          <PolicyItem theme={theme}>
            Ficam visíveis sem cifra: o identificador do aparelho gerado pelo app, o
            horário de publicação, a quantidade de registros de cada lote e a chave
            pública do grupo. Os relays também veem o endereço IP do aparelho.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>
              Os registros publicados continuam nos relays
            </BoldText>{" "}
            depois que você sai do grupo, reseta o app ou o desinstala. O DOMUS não
            consegue apagá-los.
          </PolicyItem>
        </PolicySection>

        {/* 3. IA */}
        <PolicySection icon="cpu" title="Assistente de IA (opcional)" theme={theme}>
          <PolicyItem theme={theme}>
            Só funciona se você cadastrar a sua própria chave de API de um provedor:
            OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Qwen ou OpenRouter. As
            chamadas saem do aparelho direto para o provedor, sem passar por
            servidor do DOMUS, e seguem a política desse provedor.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Sem precisar de permissão,</BoldText>
            {" "}cada mensagem envia ao provedor as 6 últimas mensagens da conversa e
            mais: numa conversa comum, saldo total, receita e despesa do mês, taxa
            de poupança e a sua mensagem; num pedido de resumo do mês, esses mesmos
            números, as 3 categorias com mais gastos (valor e percentual) e um
            índice de variação dos gastos, no lugar da sua mensagem; num pedido de
            conselho de compra, seu perfil (tolerância a risco, taxa de poupança,
            índices de impulsividade e de variação dos gastos), a tendência de
            gastos, o preço do item e a sua pergunta.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>
              Só se você liberar nas configurações da IA
            </BoldText>
            {" "}(todas começam desligadas): até 50 transações recentes (data, valor,
            categoria e descrição), contas (nome, tipo, saldo e limite), categorias,
            até 10 notas fiscais (data, emissor e valor), lista de desejos, nível e
            conquistas, e dados da sincronização (se há grupo, quantidade de
            eventos e de relays e a última sincronização). O código do grupo nunca
            é enviado à IA.
          </PolicyItem>
          <PolicyItem theme={theme}>
            Ao revisar uma nota fiscal, o nome de um item pode ser enviado ao
            provedor de IA configurado para sugerir a categoria.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Voz (só se você ligar a voz):</BoldText>
            {" "}o texto a ser falado vai ao provedor de áudio escolhido (OpenAI,
            Gemini, Qwen ou ElevenLabs), que devolve o áudio. A voz que você grava
            vai à OpenAI, ao Gemini ou à ElevenLabs para ser transcrita ou
            entendida.
          </PolicyItem>
          <PolicyItem theme={theme}>
            As respostas da IA são informativas e não são aconselhamento financeiro
            profissional.
          </PolicyItem>
        </PolicySection>

        {/* 4. Câmera e fotos */}
        <PolicySection icon="camera" title="Câmera e fotos" theme={theme}>
          <PolicyItem theme={theme}>
            A câmera serve para ler o QR Code de notas fiscais e para fotografar
            notas fiscais e holerites.
          </PolicyItem>
          <PolicyItem theme={theme}>
            Ao ler o QR Code, o app abre a página da SEFAZ do seu estado com a chave
            de acesso da nota, para buscar os itens.
          </PolicyItem>
          <PolicyItem theme={theme}>
            Com a IA configurada, a foto, tirada ou escolhida na galeria, vai ao
            provedor de IA escolhido para leitura do texto. Se você cadastrar uma chave do Google Cloud Vision, a
            foto também vai ao Google Cloud Vision quando a leitura feita no
            aparelho tem confiança abaixo de 60%.
          </PolicyItem>
          <PolicyItem theme={theme}>
            Fotos de notas e holerites podem conter nome, CPF, empregador e salário.
          </PolicyItem>
          <PolicyItem theme={theme}>
            O DOMUS não salva as fotos de forma permanente.
          </PolicyItem>
        </PolicySection>

        {/* 5. Backup e Google Drive */}
        <PolicySection icon="hard-drive" title="Backup e Google Drive" theme={theme}>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Backup manual:</BoldText>
            {" "}gera um arquivo .domusbackup cifrado com AES-256-GCM, com chave
            derivada da sua senha (PBKDF2-SHA256, 100 mil iterações). O DOMUS não
            conhece a senha, e você escolhe para onde enviar o arquivo. Também
            existe a exportação sem criptografia: esse arquivo pode ser lido por
            qualquer pessoa que tenha acesso a ele.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Cópia automática:</BoldText>
            {" "}no Android e no iOS, uma vez por dia, ao abrir o app, o DOMUS grava
            uma cópia cifrada (AES-256-GCM, PBKDF2-SHA256 com 100 mil iterações) na
            pasta do app, com uma chave gerada no próprio aparelho.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Google Drive (opcional):</BoldText>
            {" "}se você conectar sua conta Google, essa cópia diária é enviada
            automaticamente para a pasta de dados do app no seu Drive, que fica
            oculta. O e-mail da conta e o acesso ao Drive ficam no armazenamento
            seguro do aparelho.
          </PolicyItem>
        </PolicySection>

        {/* 6. Estatísticas e anúncios */}
        <PolicySection icon="bar-chart-2" title="Estatísticas e anúncios" theme={theme}>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Firebase (Google):</BoldText>
            {" "}Analytics (uso do app), Crashlytics (relatórios de falha) e
            Performance (desempenho) começam desligados. Só enviam dados se você
            aceitar no aviso de consentimento ou ligar em Sobre › Analytics &amp;
            Performance, e você pode desligá-los a qualquer momento.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Anúncios (Google AdMob):</BoldText>
            {" "}o modo de apoio padrão não tem anúncios. Se você escolher um modo de
            apoio com anúncios, o AdMob recebe dados do aparelho, como o ID de
            publicidade, e pode mostrar anúncios personalizados. Volte ao modo sem
            anúncios para parar.
          </PolicyItem>
        </PolicySection>

        {/* 7. Outros serviços */}
        <PolicySection icon="globe" title="Outros serviços consultados" theme={theme}>
          <PolicyItem theme={theme}>
            Nestes acessos o app não envia dados pessoais, mas os serviços veem o
            endereço IP do aparelho:
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Cotação do dólar</BoldText> (AwesomeAPI,
            DolarAPI e ExchangeRate-API), para estimar o custo da IA.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Classificação de itens de nota:</BoldText> o
            código de barras (EAN) do item vai ao Open Food Facts e ao Cosmos
            (Bluesoft); a tabela pública de NCM é baixada do Portal Único Siscomex.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Lista de desejos:</BoldText> o app acessa as
            páginas dos produtos que você salvou para atualizar o preço, e busca o
            ícone de cada loja no serviço de ícones do Google, que recebe o endereço
            da loja.
          </PolicyItem>
        </PolicySection>

        {/* 8. Direitos e exclusão */}
        <PolicySection icon="user-x" title="Seus direitos e exclusão" theme={theme}>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Apagar os dados do aparelho:</BoldText> use
            &quot;Resetar aplicativo&quot; na tela Sobre ou desinstale o app.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>O reset e a desinstalação não apagam:</BoldText>{" "}
            registros já publicados nos relays Nostr; cópias no seu Google Drive
            (apague-as no Drive ou remova o acesso do DOMUS na sua Conta Google);
            arquivos de backup que você exportou; e dados já enviados a provedores
            de IA, ao Firebase ou ao AdMob, que seguem as políticas desses serviços.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Exportar seus dados:</BoldText> use o backup.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Parar envios:</BoldText> saia do grupo de
            sincronização, desconecte o Google Drive, remova as chaves de IA ou
            desligue as permissões de dados, desligue as estatísticas e escolha o
            modo de apoio sem anúncios.
          </PolicyItem>
        </PolicySection>

        {/* 9. Contato */}
        <PolicySection icon="mail" title="Contato" theme={theme}>
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
          onPress={() => { soundManager.play("tap"); safeOpenUrl(EXTERNAL_POLICY_URL); }}
          accessibilityLabel="Ver política de privacidade online"
          accessibilityRole="link"
        >
          <Feather name="external-link" size={16} color={theme.primaryColor} />
          <Text style={[s.externalLinkText, { color: theme.primaryColor }]}>
            Ver política online
          </Text>
        </TouchableOpacity>

        <TText variant="caption" secondary textAlign="center" marginTop={4}>
          DOMUS · Pixel Eucarístico · {LAST_UPDATED}
        </TText>
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
    <TCard
      backgroundColor={theme.cardBackground}
      borderColor={theme.border}
      padding={0}
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
        <TText variant="subtitle" bold color={theme.textColor} fontSize={15}>{title}</TText>
      </View>
      <View
        style={[s.sectionDivider, { backgroundColor: theme.border }]}
      />
      <View style={s.sectionBody}>{children}</View>
    </TCard>
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
  });
}
