import type { LooseComponent, TInputProps } from "./types";
import { styled, Input } from "tamagui";

/**
 * Input estilizado DOMUS com Tamagui.
 * Substitui TextInput + StyleSheet padrão.
 *
 * Uso:
 *   <TInput placeholder="Nome" value={name} onChangeText={setName} />
 *   <TInput variant="search" placeholder="Buscar..." />
 */
const TInputStyled = styled(Input, {
  fontFamily: "$body",
  fontSize: "$5", // 14px
  color: "$color",
  // @ts-expect-error — o config do styled(Input) sugere 'background', mas backgroundColor é válido em runtime
  backgroundColor: "$cardBackground",
  borderWidth: 1,
  borderColor: "$borderColor",
  borderRadius: "$md",
  height: "$inputHeight",
  paddingHorizontal: "$lg",
  placeholderTextColor: "$colorSecondary",

  focusStyle: {
    borderColor: "$primary",
    borderWidth: 2,
  },

  variants: {
    search: {
      true: {
        borderRadius: "$xl",
        paddingLeft: "$xxl",
      },
    },
  } as const,
});

// Tipos relaxados: o app passa cores do ThemeColors como string — ver types.ts
export const TInput = TInputStyled as unknown as LooseComponent<TInputProps>;
