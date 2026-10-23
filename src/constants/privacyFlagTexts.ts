// ─── O que cada flag envia e o que se perde sem ela (Story 12.7) ────────────
//
// Fonte das frases mostradas ao lado de cada flag no app. As mesmas frases,
// palavra por palavra, ficam em `docs/politica-de-privacidade.md` (a fonte da
// política), em `app/privacy-policy.tsx` e na cópia da política em
// `PLAY_STORE_LISTING.md`; o teste `__tests__/privacyFlagTexts.test.ts` falha
// se uma delas faltar. Ao mudar uma frase aqui, mude as três cópias.
//
// Só afirme o que o código faz hoje. Sem `react-native`, para rodar no vitest.
// As frases não usam aspas duplas nem `&`, para caberem em atributos JSX.

export type PrivacyFlagId =
  | "ai"
  | "aiDataPermissions"
  | "voice"
  | "visionOcr"
  | "cloudVision"
  | "sync"
  | "googleDrive"
  | "firebaseAnalytics"
  | "firebasePerformance"
  | "firebaseCrashlytics"
  | "adModes"
  | "personalizedAds"
  | "externalLookups";

export interface PrivacyFlagText {
  /** Nome da flag como aparece no app. */
  title: string;
  /** O que sai do aparelho quando a flag está ligada (vem depois de "Envia:"). */
  sends: string;
  /** O que se perde com a flag desligada (vem depois de "Sem isso:"). */
  loses: string;
  /**
   * Linha curta para telas de configuração com espaço de uma linha; o texto
   * completo (`formatPrivacyFlagText`) fica a um toque, no "Saiba mais".
   */
  shortDescription?: string;
}

export const PRIVACY_FLAG_TEXTS: Record<PrivacyFlagId, PrivacyFlagText> = {
  ai: {
    title: "Ativar IA",
    sends:
      "a sua mensagem, as 6 últimas mensagens da conversa e um resumo do mês (saldo, receita, despesa e taxa de poupança) ao provedor de IA escolhido, com a sua chave de API; ao revisar uma nota fiscal, o nome do item, para sugerir a categoria.",
    loses:
      "não há chat com a IA, resumo do mês, conselho de compra nem sugestão de categoria pela IA; o resto do app funciona normalmente.",
  },
  aiDataPermissions: {
    title: "Acesso aos dados",
    sends:
      "só o que você liberar, junto de cada mensagem à IA: até 50 transações recentes (data, tipo, valor, categoria e descrição), contas (nome, tipo, saldo e limite de crédito), categorias (nome e grupo), até 10 notas fiscais (data, emissor, quantidade de itens e valor total), lista de desejos (nome, urgência e preço), troféus e conquistas (nível, XP total e da temporada, sequência atual e maior sequência, quantidade de conquistas e de troféus mensais) e sincronização (se há grupo, sync automático, quantidade de eventos e de relays e a última sincronização), nunca o código do grupo.",
    loses:
      "a IA responde só com o resumo do mês e não comenta as suas transações, contas, notas, desejos, conquistas nem a sincronização.",
  },
  voice: {
    title: "Modo Voz",
    sends:
      "a gravação da sua voz, que sai do aparelho para a OpenAI, o Gemini ou a ElevenLabs, para ser transcrita, e o texto das respostas ao provedor de áudio escolhido (OpenAI, Gemini, Qwen ou ElevenLabs), para virar fala.",
    loses: "não há perguntas por voz nem respostas faladas; o chat segue por texto.",
  },
  visionOcr: {
    title: "OCR por Visão (IA)",
    sends:
      "a foto da nota fiscal ou do holerite que você tirar ou escolher no chat ao provedor de IA ativo, que lê o texto; a foto pode conter nome, CPF, empregador e salário.",
    loses:
      "o chat da IA não lê fotos; a importação de notas continua com a leitura feita no aparelho.",
  },
  cloudVision: {
    title: "Google Cloud Vision",
    sends:
      "a foto da nota fiscal ou do holerite ao Google Cloud Vision, com a sua chave, quando a leitura no aparelho falha ou tem confiança abaixo de 60%, ou sempre, se o Cloud Vision for o provedor principal.",
    loses: "a leitura das fotos fica só no aparelho, sem a segunda tentativa do Google.",
  },
  sync: {
    title: "Sincronização",
    sends:
      "seus registros a seis relays Nostr públicos, cifrados com uma chave derivada do código do grupo, uma proteção simples; o identificador do aparelho, o horário, o tamanho de cada lote e a chave pública do grupo vão sem cifra, os relays veem o endereço IP e os registros continuam lá depois que você sai do grupo.",
    loses: "seus dados ficam só neste aparelho, sem cópia nos seus outros aparelhos.",
  },
  googleDrive: {
    title: "Google Drive",
    sends:
      "a cópia diária cifrada do backup automático para a pasta oculta do app no seu Google Drive.",
    loses:
      "a cópia automática cifrada fica só neste aparelho, sem cópia na nuvem para restaurar em outro.",
  },
  firebaseAnalytics: {
    title: "Analytics de Uso",
    sends:
      "eventos de uso coletados automaticamente, como a abertura do app e a duração das sessões, versão do app e do sistema, o ID da instalação do app e, quando houver, o ID de publicidade ao Google Firebase, que também vê o endereço IP.",
    loses: "nada muda para você; o DOMUS deixa de saber quais recursos são usados.",
  },
  firebasePerformance: {
    title: "Performance",
    sends:
      "tempos de carregamento, de tela e de rede, versão do app e do sistema e o ID da instalação do app ao Google Firebase, que também vê o endereço IP.",
    loses: "nada muda para você; o DOMUS deixa de ver onde o app fica lento.",
  },
  firebaseCrashlytics: {
    title: "Crash Reports",
    sends:
      "relatórios de falha do app, com a mensagem de erro e a pilha de componentes, que podem conter textos do app, a versão do app e do sistema e o ID da instalação do app ao Google Firebase, que também vê o endereço IP.",
    loses: "nada muda para você; as falhas do seu aparelho demoram mais a ser corrigidas.",
  },
  adModes: {
    title: "Modos de apoio com anúncio",
    sends:
      "ao Google AdMob o ID de publicidade, informações do aparelho, o endereço IP, do qual ele tira a localização aproximada, e como você interage com os anúncios, para entregar e medir os anúncios.",
    loses:
      "com só o modo Apenas Links na Lista, o app não inicia o SDK do AdMob nem pede anúncios ao Google; você ainda apoia o DOMUS pelos links de afiliado da lista de desejos e por doações.",
  },
  personalizedAds: {
    title: "Anúncios personalizados",
    sends:
      "o ID de publicidade, informações do aparelho e do uso dos anúncios, que o Google usa para escolher anúncios pelos seus interesses.",
    loses:
      "os anúncios continuam, não personalizados e menos relacionados a você; o Google ainda recebe dados do aparelho para entregar e medir os anúncios.",
  },
  externalLookups: {
    title: "Consultas de itens, preços e ícones",
    shortDescription: "Busca produtos, preços e ícones online.",
    sends:
      "o código de barras dos itens de nota ao Open Food Facts e ao Cosmos (Bluesoft), o pedido da tabela de NCM ao Portal Único Siscomex, o acesso a cada 24 h às páginas dos produtos da lista de desejos e o domínio de cada loja ao serviço de ícones do Google.",
    loses:
      "os itens são classificados pela tabela interna de NCM, por palavras-chave e, se ligada, pela IA; a lista de desejos mostra o último preço salvo e as lojas aparecem com ícone genérico.",
  },
};

/** Texto de uma flag em duas linhas: "Envia: …" e "Sem isso: …". */
export function formatPrivacyFlagText(id: PrivacyFlagId): string {
  const t = PRIVACY_FLAG_TEXTS[id];
  return `Envia: ${t.sends}\nSem isso: ${t.loses}`;
}
