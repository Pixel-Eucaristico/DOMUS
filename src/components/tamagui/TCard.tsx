import { styled, View } from "tamagui";

/**
 * Card estilizado DOMUS com Tamagui.
 * Substitui View + StyleSheet com cardBackground/border/radius padrão.
 *
 * Uso:
 *   <TCard>Conteúdo</TCard>
 *   <TCard elevated>Card com sombra</TCard>
 */
export const TCard = styled(View, {
  backgroundColor: "$cardBackground",
  borderRadius: "$lg",
  padding: "$lg",
  borderWidth: 1,
  borderColor: "$borderColor",

  variants: {
    elevated: {
      true: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    },
    compact: {
      true: {
        padding: "$md",
      },
    },
  } as const,
});
