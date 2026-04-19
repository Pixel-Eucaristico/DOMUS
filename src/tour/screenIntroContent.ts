export interface ScreenIntroItem {
  icon: string;
  iconSet?: "Feather" | "MaterialCommunityIcons";
  title: string;
  description: string;
}

export interface ScreenIntroDef {
  screenTitle: string;
  items: ScreenIntroItem[];
}

export const SCREEN_INTROS: Record<string, ScreenIntroDef> = {
  home: {
    screenTitle: "Tela Inicial",
    items: [
      {
        icon: "home",
        title: "Dashboard & Saldo Total",
        description:
          "Veja seu saldo consolidado de todas as contas e o resumo financeiro do mês.",
      },
      {
        icon: "pie-chart",
        title: "Regra 50 / 30 / 20",
        description:
          "Suas despesas são classificadas em Essencial (50%), Estilo de Vida (30%) e Futuro (20%).",
      },
      {
        icon: "plus-circle",
        title: "Registrar Transação",
        description:
          "Toque em '+' para lançar receita, despesa ou transferência com categoria e recorrência.",
      },
      {
        icon: "robot-happy",
        iconSet: "MaterialCommunityIcons",
        title: "Assistente IA",
        description:
          "Converse com o assistente de IA sobre suas finanças — ele analisa seu histórico.",
      },
    ],
  },
  accounts: {
    screenTitle: "Contas & Cartões",
    items: [
      {
        icon: "credit-card",
        title: "Suas Contas",
        description:
          "Cadastre carteiras, contas bancárias e cartões. Saldo atualizado a cada transação.",
      },
    ],
  },
  importInvoice: {
    screenTitle: "Importar Nota Fiscal",
    items: [
      {
        icon: "camera",
        title: "QR Code da NF-e",
        description:
          "Escaneie o QR Code da nota fiscal — o DOMUS preenche tudo automaticamente.",
      },
      {
        icon: "edit-3",
        title: "Lançamento Manual",
        description: "Prefere digitar? Use este botão para lançar a nota passo a passo.",
      },
    ],
  },
  wishlist: {
    screenTitle: "Lista de Desejos",
    items: [
      {
        icon: "heart",
        title: "Lista de Desejos",
        description:
          "Organize compras futuras por prioridade. Vincule links e acompanhe o progresso.",
      },
      {
        icon: "target",
        title: "Objetivo de Poupança",
        description:
          "Vincule uma conta poupança a um item — o saldo vira barra de progresso.",
      },
    ],
  },
  season: {
    screenTitle: "Temporada",
    items: [
      {
        icon: "star",
        title: "Conquistas & XP",
        description:
          "Cada transação gera XP e mantém sua sequência diária. Suba de nível e desbloqueie conquistas.",
      },
      {
        icon: "gift",
        title: "Troféu do Mês",
        description:
          "Todo mês um troféu único é sorteado. Repita em anos seguintes para subir de Bronze a Ouro.",
      },
    ],
  },
  about: {
    screenTitle: "Configurações",
    items: [
      {
        icon: "bell",
        title: "Lembretes Inteligentes",
        description:
          "Configure alertas de vencimento e resumos semanais. Tudo local, sem servidores.",
      },
      {
        icon: "lock",
        title: "Bloqueio por PIN ou Biometria",
        description:
          "Ative a tela de bloqueio em Segurança. O app trava ao ir para segundo plano.",
      },
    ],
  },
  sync: {
    screenTitle: "Sincronização",
    items: [
      {
        icon: "refresh-cw",
        title: "Sincronização P2P",
        description:
          "Conecte dispositivos via QR Code. Dados replicados com criptografia ponta-a-ponta, sem nuvem.",
      },
      {
        icon: "archive",
        title: "Backup & Restauração",
        description:
          "Exporte seus dados criptografados (AES-256) ou restaure de um arquivo anterior.",
      },
    ],
  },
  backup: {
    screenTitle: "Backup",
    items: [
      {
        icon: "database",
        title: "Backup Criptografado",
        description:
          "Exporte todos os dados em .domusbackup protegido por senha. Restaure em qualquer dispositivo.",
      },
    ],
  },
};
