import type { LooseComponent, TButtonProps } from "./types";
import { styled, Button } from "tamagui";

/**
 * Botão estilizado DOMUS com Tamagui.
 * Substitui Pressable + StyleSheet para novos componentes.
 *
 * Uso:
 *   <TButton onPress={fn}>Salvar</TButton>
 *   <TButton variant="outline" onPress={fn}>Cancelar</TButton>
 *   <TButton variant="danger" onPress={fn}>Excluir</TButton>
 */
const TButtonStyled = styled(Button, {
  // @ts-expect-error — o config do styled(Button) não tipa fontFamily, mas o Tamagui aplica em runtime
  fontFamily: "$body",
  fontWeight: "600",
  borderRadius: "$lg",
  height: "$btnHeight",
  paddingHorizontal: "$xl",

  variants: {
    variant: {
      primary: {
        backgroundColor: "$primary",
        color: "#FFFFFF",
        pressStyle: { opacity: 0.85, scale: 0.98 },
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "$borderColor",
        color: "$color",
        pressStyle: { opacity: 0.7 },
      },
      danger: {
        backgroundColor: "$danger",
        color: "#FFFFFF",
        pressStyle: { opacity: 0.85, scale: 0.98 },
      },
      ghost: {
        backgroundColor: "transparent",
        color: "$primary",
        pressStyle: { opacity: 0.6 },
      },
    },
  } as const,

  defaultVariants: {
    variant: "primary",
  },
});

// Tipos relaxados: o app passa cores do ThemeColors como string — ver types.ts
export const TButton = TButtonStyled as unknown as LooseComponent<TButtonProps>;
