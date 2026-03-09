export type ArrowDirection = "up" | "down" | "left" | "right";

export interface TourStepDef {
  id: number;
  tag: string;
  title: string;
  description: string;
  icon: string;
  iconSet?: "Feather" | "MaterialCommunityIcons";
  route?: string;
  targetId?: string;
  arrowDirection?: ArrowDirection;
  arrowAlign?: "left" | "right" | "center";
  arrowOffset?: number;
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    id: 0,
    tag: "Boas-vindas",
    title: "Bem-vindo ao DOMUS!",
    description:
      "Tudo o que você fizer agora é apenas um teste — ambiente sandbox seguro. " +
      "Seus dados reais estão protegidos e nada será salvo ao encerrar o tour.",
    icon: "award",
    route: "/(tabs)",
  },
  {
    id: 1,
    tag: "Aba: Início",
    title: "Dashboard & Saldo Total",
    description:
      "A tela inicial exibe seu saldo consolidado de todas as contas, " +
      "evolução mensal e resumo das finanças do mês atual.",
    icon: "home",
    route: "/(tabs)",
    targetId: "dashboard-balance",
    arrowDirection: "up",
  },
  {
    id: 2,
    tag: "Aba: Início",
    title: "Regra 50 / 30 / 20",
    description:
      "Suas despesas são classificadas automaticamente: 50% Essencial (moradia, saúde), " +
      "30% Estilo de Vida (lazer, vestuário) e 20% Futuro (investimentos, poupança).",
    icon: "pie-chart",
    route: "/(tabs)",
    targetId: "budget-section",
    arrowDirection: "up",
  },
  {
    id: 3,
    tag: "Aba: Contas",
    title: "Contas & Cartões",
    description:
      "Cadastre carteiras, contas bancárias, cartões de crédito e contas poupança. " +
      "Cada conta tem cor, limite e saldo atualizados automaticamente a cada transação.",
    icon: "credit-card",
    route: "/(tabs)/accounts",
    targetId: "accounts-add",
    arrowDirection: "up",
    arrowAlign: "right",
  },
  {
    id: 4,
    tag: "Função: Transação",
    title: "Registrar Transação",
    description:
      "Toque em '+' para lançar receita, despesa ou transferência. " +
      "Defina categoria, status (pendente/confirmado), recorrência e até parcelas.",
    icon: "plus-circle",
    route: "/(tabs)",
    targetId: "fab-add",
    arrowDirection: "down",
    arrowAlign: "right",
  },
  {
    id: 5,
    tag: "Função: Importação",
    title: "Importar Nota Fiscal",
    description:
      "Escaneie o QR Code da NF-e com a câmera ou digite a chave de acesso. O DOMUS preenche tudo automaticamente.",
    icon: "camera",
    route: "/import-invoice",
    targetId: "import-qr",
    arrowDirection: "up",
  },
  {
    id: 6,
    tag: "Função: Importação",
    title: "Lançamento Manual",
    description:
      "Se preferir, use este botão para lançar manualmente a nota fiscal ou a despesa passo a passo.",
    icon: "edit-3",
    route: "/import-invoice",
    targetId: "import-manual",
    arrowDirection: "up",
  },
  {
    id: 7,
    tag: "Função: Dízimo",
    title: "Calculadora de Dízimo",
    description:
      "Ao selecionar «Dízimo / Oferta» como categoria, um painel aparece para calcular " +
      "o percentual sobre a renda bruta ou líquida. O valor é preenchido automaticamente.",
    icon: "percent",
    route: "/(tabs)",
  },
  {
    id: 8,
    tag: "Aba: Desejos",
    title: "Lista de Desejos",
    description:
      "Organize compras futuras em listas com prioridades (Urgente → Baixa). " +
      "Arraste para reordenar, vincule links da Amazon / Mercado Livre e veja links de afiliado.",
    icon: "heart",
    route: "/(tabs)/wishlist",
    targetId: "wishlist-header",
    arrowDirection: "up",
  },
  {
    id: 9,
    tag: "Função: Poupança",
    title: "Objetivo de Poupança",
    description:
      "Vincule uma conta poupança a itens da lista de desejos. " +
      "O saldo vira barra de progresso no item — você vê exatamente quanto falta.",
    icon: "target",
    route: "/(tabs)/wishlist",
    targetId: "wishlist-add",
    arrowDirection: "down",
    arrowAlign: "right",
  },
  {
    id: 10,
    tag: "Aba: Temporada",
    title: "Conquistas & XP",
    description:
      "Cada transação gera XP e mantém sua sequência diária (streak). " +
      "Suba de nível e desbloqueie 8 conquistas: Prata, Ouro e Diamante.",
    icon: "star",
    route: "/(tabs)/season",
    targetId: "xp-section",
    arrowDirection: "up",
  },
  {
    id: 11,
    tag: "Aba: Temporada",
    title: "Troféu do Mês",
    description:
      "Todo mês um troféu único é sorteado — secular ou litúrgico (para usuários católicos). " +
      "Repetindo em anos seguintes, o nível sobe: Bronze, Prata e Ouro.",
    icon: "gift",
    route: "/(tabs)/season",
    targetId: "trophy-section",
    arrowDirection: "down",
  },
  {
    id: 12,
    tag: "Recurso: IA",
    title: "Assistente Financeiro IA",
    description:
      "Converse com o assistente de IA sobre suas finanças. Ele analisa seu histórico, " +
      "sugere metas e responde dúvidas com base nos seus dados reais.",
    icon: "robot-happy",
    iconSet: "MaterialCommunityIcons",
    route: "/(tabs)",
    targetId: "ai-chat-btn",
    arrowDirection: "up",
    arrowAlign: "right",
    arrowOffset: 74,
  },
  {
    id: 13,
    tag: "Recurso: IA",
    title: "Configurar API",
    description:
      "Para conversar com a IA, você precisa cadastrar sua chave de API (OpenAI ou Google Gemini). " +
      "Clique no ícone de configurações no topo para acessar a tela de chaves.",
    icon: "settings",
    route: "/ai-chat",
    targetId: "ai-config-btn",
    arrowDirection: "up",
    arrowAlign: "right",
    arrowOffset: 24,
  },
  {
    id: 14,
    tag: "Aba: Início",
    title: "Configurações Gerais",
    description:
      "Acesse este menu para configurar Segurança, Exportação de Backup, Temas Claro/Escuro e mais.",
    icon: "settings",
    route: "/(tabs)",
    targetId: "dashboard-settings",
    arrowDirection: "up",
    arrowAlign: "right",
    arrowOffset: 34,
  },
  {
    id: 15,
    tag: "Recurso: Notificações",
    title: "Lembretes Inteligentes",
    description:
      "Configure lembretes de vencimento, alertas quando se aproximar do " +
      "limite do orçamento e resumos semanais. Tudo local — sem servidores.",
    icon: "bell",
    route: "/about",
    targetId: "notifications-btn",
    arrowDirection: "up",
    arrowAlign: "center",
  },
  {
    id: 16,
    tag: "Recurso: Segurança",
    title: "Bloqueio por PIN ou Biometria",
    description:
      "Ative a tela de bloqueio em Configurações → Segurança. " +
      "O app trava ao ir para segundo plano e exige PIN ou digital para entrar.",
    icon: "lock",
    route: "/about",
    targetId: "security-btn",
    arrowDirection: "up",
    arrowAlign: "center",
  },
  {
    id: 17,
    tag: "Recurso: Sync",
    title: "Sincronizar Dispositivos",
    description:
      "Toque aqui para abrir a tela de sincronização. " +
      "Conecte dois ou mais celulares para manter seus dados sempre atualizados — sem nuvem.",
    icon: "refresh-cw",
    route: "/(tabs)",
    targetId: "sync-btn",
    arrowDirection: "up",
    arrowAlign: "center",
  },
  {
    id: 18,
    tag: "Recurso: Sync",
    title: "Sincronização P2P",
    description:
      "Crie um grupo e compartilhe o código ou QR Code. " +
      "Seus dados são replicados via relays Nostr com criptografia ponta-a-ponta, sem servidor central.",
    icon: "refresh-cw",
    route: "/sync",
    targetId: "sync-actions",
    arrowDirection: "up",
  },
  {
    id: 19,
    tag: "Recurso: Backup",
    title: "Backup & Restauração",
    description:
      "Toque aqui para acessar a tela de backup. " +
      "Exporte seus dados criptografados (AES-256) ou restaure de um arquivo anterior.",
    icon: "archive",
    route: "/sync",
    targetId: "sync-backup-link",
    arrowDirection: "up",
  },
  {
    id: 20,
    tag: "Recurso: Backup",
    title: "Backup Criptografado",
    description:
      "Exporte todos os dados em um arquivo .domusbackup protegido por senha (AES-256). " +
      "Restaure em qualquer dispositivo — nenhum dado vai para a nuvem.",
    icon: "database",
    route: "/backup",
  },
  {
    id: 21,
    tag: "Pronto!",
    title: "Tudo Configurado!",
    description:
      "Você conheceu todas as funções do DOMUS! " +
      "Agora crie sua primeira conta para começar a organizar suas finanças. " +
      "Cada passo conta para sua liberdade financeira!",
    icon: "zap",
    route: "/(tabs)/accounts",
  },
];

export const TOUR_TOTAL = TOUR_STEPS.length;
