import * as React from "react";
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

const TInputRaw = TInputStyled as unknown as LooseComponent<TInputProps>;

const TInputBase = React.forwardRef<unknown, TInputProps>(
  ({ background, backgroundColor, ...rest }, ref) => {
    const resolvedBg = backgroundColor !== undefined ? backgroundColor : background;
    return (
      <TInputRaw
        ref={ref}
        {...(resolvedBg !== undefined ? { backgroundColor: resolvedBg } : {})}
        {...rest}
      />
    );
  },
);
TInputBase.displayName = "TInput";

// Tipos relaxados: o app passa cores do ThemeColors como string — ver types.ts
export const TInput = TInputBase as unknown as LooseComponent<TInputProps>;
