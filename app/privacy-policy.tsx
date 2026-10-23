import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAppState } from "@/src/context/AppStateProvider";
import { soundManager } from "@/src/services/SoundManager";
import { TCard, TText } from "@/src/components/tamagui";
import { appAlert } from "@/src/services/appAlert";

const LAST_UPDATED = "21 de outubro de 2026";
const EXTERNAL_POLICY_URL =
  "https://pixel-eucaristico.com.br/domus/privacy";

async function safeOpenUrl(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      appAlert("Erro", "Não foi possível abrir este link.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    appAlert("Erro", "Não foi possível abrir este link.");
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
          que acontece. Os recursos marcados abaixo com &quot;Envia:&quot; e
          &quot;Sem isso:&quot; têm uma opção no app para ligar ou desligar, ou
          escolher um modo; ao lado dela, o app diz o que ela envia e o que você
          perde sem ela, com as mesmas frases. Os outros acessos (a página da
          SEFAZ pela chave de acesso da nota, a página de um produto cujo link
          você cola ou compartilha e a busca na Amazon ou no Mercado Livre) só
          acontecem quando você os pede.
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
          <FlagItem
            theme={theme}
            title="Sincronização"
            sends="seus registros a seis relays Nostr públicos, cifrados com uma chave derivada do código do grupo, uma proteção simples; o identificador do aparelho, o horário, o tamanho de cada lote e a chave pública do grupo vão sem cifra, os relays veem o endereço IP e os registros continuam lá depois que você sai do grupo."
            loses="seus dados ficam só neste aparelho, sem cópia nos seus outros aparelhos."
          />
        </PolicySection>

        {/* 3. IA */}
        <PolicySection icon="cpu" title="Assistente de IA (opcional)" theme={theme}>
          <PolicyItem theme={theme}>
            Só funciona se você cadastrar a sua própria chave de API de um provedor:
            OpenAI, Google Gemini, Anthropic Claude, DeepSeek, Qwen ou OpenRouter, e
            ligar &quot;Ativar IA&quot;. As chamadas saem do aparelho direto para o
            provedor, sem passar por servidor do DOMUS, e seguem a política desse
            provedor.
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
            {" "}(todas começam desligadas): os dados listados em &quot;Acesso aos
            dados&quot;, abaixo. O código do grupo nunca é enviado à IA.
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
          <FlagItem
            theme={theme}
            title="Ativar IA"
            sends="a sua mensagem, as 6 últimas mensagens da conversa e um resumo do mês (saldo, receita, despesa e taxa de poupança) ao provedor de IA escolhido, com a sua chave de API; ao revisar uma nota fiscal, o nome do item, para sugerir a categoria."
            loses="não há chat com a IA, resumo do mês, conselho de compra nem sugestão de categoria pela IA; o resto do app funciona normalmente."
          />
          <FlagItem
            theme={theme}
            title="Acesso aos dados"
            sends="só o que você liberar, junto de cada mensagem à IA: até 50 transações recentes (data, tipo, valor, categoria e descrição), contas (nome, tipo, saldo e limite de crédito), categorias (nome e grupo), até 10 notas fiscais (data, emissor, quantidade de itens e valor total), lista de desejos (nome, urgência e preço), troféus e conquistas (nível, XP total e da temporada, sequência atual e maior sequência, quantidade de conquistas e de troféus mensais) e sincronização (se há grupo, sync automático, quantidade de eventos e de relays e a última sincronização), nunca o código do grupo."
            loses="a IA responde só com o resumo do mês e não comenta as suas transações, contas, notas, desejos, conquistas nem a sincronização."
          />
          <FlagItem
            theme={theme}
            title="Modo Voz"
            sends="a gravação da sua voz, que sai do aparelho para a OpenAI, o Gemini ou a ElevenLabs, para ser transcrita, e o texto das respostas ao provedor de áudio escolhido (OpenAI, Gemini, Qwen ou ElevenLabs), para virar fala."
            loses="não há perguntas por voz nem respostas faladas; o chat segue por texto."
          />
          <FlagItem
            theme={theme}
            title="OCR por Visão (IA)"
            sends="a foto da nota fiscal ou do holerite que você tirar ou escolher no chat ao provedor de IA ativo, que lê o texto; a foto pode conter nome, CPF, empregador e salário."
            loses="o chat da IA não lê fotos; a importação de notas continua com a leitura feita no aparelho."
          />
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
            Com a IA e o &quot;OCR por Visão (IA)&quot; ligados, a foto que você
            tirar ou escolher na galeria pelo chat da IA vai ao provedor de IA
            escolhido para leitura do texto.
          </PolicyItem>
          <PolicyItem theme={theme}>
            Na importação de notas, a leitura das fotos é feita no aparelho. Se você
            cadastrar uma chave do Google Cloud Vision, a foto também vai ao Google
            Cloud Vision quando a leitura feita no aparelho falha ou tem confiança
            abaixo de 60%; se você escolher o Cloud Vision como provedor principal,
            a foto vai a ele primeiro.
          </PolicyItem>
          <PolicyItem theme={theme}>
            Fotos de notas e holerites podem conter nome, CPF, empregador e salário.
          </PolicyItem>
          <PolicyItem theme={theme}>
            O DOMUS não salva as fotos de forma permanente.
          </PolicyItem>
          <FlagItem
            theme={theme}
            title="Google Cloud Vision"
            sends="a foto da nota fiscal ou do holerite ao Google Cloud Vision, com a sua chave, quando a leitura no aparelho falha ou tem confiança abaixo de 60%, ou sempre, se o Cloud Vision for o provedor principal."
            loses="a leitura das fotos fica só no aparelho, sem a segunda tentativa do Google."
          />
        </PolicySection>

        {/* 5. Backup e Google Drive */}
        <PolicySection icon="hard-drive" title="Backup e Google Drive" theme={theme}>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Backup manual:</BoldText>
            {" "}gera um arquivo .domusbackup cifrado com AES-256-GCM, com chave
            derivada da sua senha (PBKDF2-SHA256, 100 mil iterações). O DOMUS não
            conhece a senha, e você escolhe para onde enviar o arquivo. Também
            existe a exportação sem criptografia: o app pede confirmação antes,
            porque esse arquivo pode ser lido por qualquer pessoa que tenha acesso
            a ele.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Cópia automática:</BoldText>
            {" "}no Android e no iOS, uma vez por dia, ao abrir o app, o DOMUS grava
            uma cópia cifrada (AES-256-GCM, PBKDF2-SHA256 com 100 mil iterações) na
            pasta do app, com uma chave gerada no próprio aparelho. Essa cópia não
            sai do aparelho sozinha.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Google Drive (opcional):</BoldText>
            {" "}se você conectar sua conta Google, essa cópia diária é enviada
            automaticamente para a pasta de dados do app no seu Drive, que fica
            oculta. O e-mail da conta e o acesso ao Drive ficam no armazenamento
            seguro do aparelho. Desconecte o Drive na tela de Backup para parar o
            envio.
          </PolicyItem>
          <FlagItem
            theme={theme}
            title="Google Drive"
            sends="a cópia diária cifrada do backup automático para a pasta oculta do app no seu Google Drive."
            loses="a cópia automática cifrada fica só neste aparelho, sem cópia na nuvem para restaurar em outro."
          />
        </PolicySection>

        {/* 6. Estatísticas e anúncios */}
        <PolicySection icon="bar-chart-2" title="Estatísticas e anúncios" theme={theme}>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Firebase (Google):</BoldText>
            {" "}Analytics (uso do app), Crashlytics (relatórios de falha) e
            Performance (desempenho) começam desligados. Só enviam dados se você
            aceitar no aviso de consentimento ou ligar em Sobre › Analytics &amp;
            Performance, e você pode desligá-los a qualquer momento. Os três enviam
            o ID da instalação do app, e o Firebase vê o endereço IP do aparelho; o
            Analytics também pode ler o ID de publicidade. Esses dados não levam seu
            nome, e-mail nem dados financeiros, mas não são anônimos.
          </PolicyItem>
          <PolicyItem theme={theme}>
            <BoldText theme={theme}>Anúncios (Google AdMob):</BoldText>
            {" "}o modo de apoio padrão não tem anúncios. Se você escolher um modo de
            apoio com anúncios, o AdMob recebe dados do aparelho, como o ID de
            publicidade, e vê o endereço IP, do qual tira a localização aproximada.
            Os anúncios são não personalizados por padrão; para personalizá-los,
            ligue &quot;Anúncios personalizados&quot; em Sobre › Apoio &amp;
            Anúncios, e desligue no mesmo lugar quando quiser. Mesmo desligado, o
            Google recebe dados do aparelho para entregar e medir os anúncios.
            Volte ao modo sem anúncios para parar.
          </PolicyItem>
          <FlagItem
            theme={theme}
            title="Analytics de Uso"
            sends="eventos de uso coletados automaticamente, como a abertura do app e a duração das sessões, versão do app e do sistema, o ID da instalação do app e, quando houver, o ID de publicidade ao Google Firebase, que também vê o endereço IP."
            loses="nada muda para você; o DOMUS deixa de saber quais recursos são usados."
          />
          <FlagItem
            theme={theme}
            title="Performance"
            sends="tempos de carregamento, de tela e de rede, versão do app e do sistema e o ID da instalação do app ao Google Firebase, que também vê o endereço IP."
            loses="nada muda para você; o DOMUS deixa de ver onde o app fica lento."
          />
          <FlagItem
            theme={theme}
            title="Crash Reports"
            sends="relatórios de falha do app, com a mensagem de erro e a pilha de componentes, que podem conter textos do app, a versão do app e do sistema e o ID da instalação do app ao Google Firebase, que também vê o endereço IP."
            loses="nada muda para você; as falhas do seu aparelho demoram mais a ser corrigidas."
          />
          <FlagItem
            theme={theme}
            title="Modos de apoio com anúncio"
            sends="ao Google AdMob o ID de publicidade, informações do aparelho, o endereço IP, do qual ele tira a localização aproximada, e como você interage com os anúncios, para entregar e medir os anúncios."
            loses="com só o modo Apenas Links na Lista, o app não inicia o SDK do AdMob nem pede anúncios ao Google; você ainda apoia o DOMUS pelos links de afiliado da lista de desejos e por doações."
          />
          <FlagItem
            theme={theme}
            title="Anúncios personalizados"
            sends="o ID de publicidade, informações do aparelho e do uso dos anúncios, que o Google usa para escolher anúncios pelos seus interesses."
            loses="os anúncios continuam, não personalizados e menos relacionados a você; o Google ainda recebe dados do aparelho para entregar e medir os anúncios."
          />
        </PolicySection>

        {/* 7. Outros serviços */}
        <PolicySection icon="globe" title="Consultas de itens, preços e ícones e outros serviços" theme={theme}>
          <PolicyItem theme={theme}>
            Nestes acessos, os serviços veem o endereço IP do aparelho; cada item
            diz o que mais recebem:
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Consultas de itens, preços e ícones (opcional):</BoldText>{" "}
            com a opção ligada em Sobre › Configurações, o código de barras (EAN)
            dos itens de nota vai ao Open Food Facts e ao Cosmos (Bluesoft), a
            tabela pública de NCM é baixada do Portal Único Siscomex, o app acessa
            as páginas dos produtos que você salvou na lista de desejos para
            atualizar o preço e busca o ícone de cada loja no serviço de ícones do
            Google, que recebe o endereço da loja. Começa desligada numa instalação
            nova; quem já usava o app a recebeu ligada, com um aviso único.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Cotação do dólar</BoldText> (AwesomeAPI,
            DolarAPI e ExchangeRate-API), só no painel da IA, para estimar o custo
            da IA.
          </PolicyItem>
          <PolicyItem theme={theme}>
            • <BoldText theme={theme}>Busca de produtos na lista de desejos:</BoldText>{" "}
            quando você pede, ao adicionar um item, o app abre a busca da Amazon ou
            do Mercado Livre com o nome do produto, e os links da Amazon levam o
            código de afiliado do DOMUS. Quando você cola ou compartilha o link de
            um produto, o app acessa a página para ler o nome e o preço.
          </PolicyItem>
          <FlagItem
            theme={theme}
            title="Consultas de itens, preços e ícones"
            sends="o código de barras dos itens de nota ao Open Food Facts e ao Cosmos (Bluesoft), o pedido da tabela de NCM ao Portal Único Siscomex, o acesso a cada 24 h às páginas dos produtos da lista de desejos e o domínio de cada loja ao serviço de ícones do Google."
            loses="os itens são classificados pela tabela interna de NCM, por palavras-chave e, se ligada, pela IA; a lista de desejos mostra o último preço salvo e as lojas aparecem com ícone genérico."
          />
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
            desligue as permissões de dados, desligue as estatísticas, desligue as
            consultas de itens, preços e ícones, desligue os anúncios
            personalizados e escolha o modo de apoio sem anúncios.
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

function FlagItem({
  theme,
  title,
  sends,
  loses,
}: {
  theme: any;
  title: string;
  sends: string;
  loses: string;
}) {
  return (
    <PolicyItem theme={theme}>
      • <BoldText theme={theme}>{title}.</BoldText> Envia: {sends} Sem isso:{" "}
      {loses}
    </PolicyItem>
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
