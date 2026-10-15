import { styled, Text } from "tamagui";
import type { LooseComponent, TTextProps } from "./types";

/**
 * Texto estilizado DOMUS com Tamagui.
 * Usa DM Sans com variantes semânticas.
 *
 * Uso:
 *   <TText>Texto normal</TText>
 *   <TText variant="title">Título</TText>
 *   <TText variant="caption" secondary>Legenda</TText>
 */
const TTextStyled = styled(Text, {
  fontFamily: "$body",
  color: "$color",
  fontSize: "$5", // 14px

  variants: {
    variant: {
      title: {
        fontSize: "$10", // 22px
        fontWeight: "700",
      },
      subtitle: {
        fontSize: "$7", // 16px
        fontWeight: "600",
      },
      body: {
        fontSize: "$5", // 14px
        fontWeight: "400",
      },
      caption: {
        fontSize: "$3", // 12px
        fontWeight: "400",
      },
      label: {
        fontSize: "$4", // 13px
        fontWeight: "500",
      },
    },
    secondary: {
      true: {
        color: "$colorSecondary",
      },
    },
    bold: {
      true: {
        fontWeight: "700",
      },
    },
  } as const,

  defaultVariants: {
    variant: "body",
  },
});

// Tipos relaxados: o app passa cores do ThemeColors como string — ver types.ts
export const TText = TTextStyled as unknown as LooseComponent<TTextProps>;
