import * as React from "react";
import { resolvePrimaryButtonTextColor } from "@packages/theme";
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

const TButtonRaw = TButtonStyled as unknown as LooseComponent<TButtonProps>;

const TButtonBase = React.forwardRef<unknown, TButtonProps>(
  ({ variant, backgroundColor, bg, color, icon, ...rest }, ref) => {
    const resolvedColor = resolvePrimaryButtonTextColor({
      variant: typeof variant === "string" ? variant : undefined,
      backgroundColor,
      bg,
      color,
    });

    let resolvedIcon: React.ReactNode = icon as React.ReactNode;
    if (
      resolvedColor === "#1A1814" &&
      React.isValidElement<{ color?: unknown }>(icon) &&
      typeof icon.props?.color === "string" &&
      /^#fff(?:fff)?$/i.test(icon.props.color.trim())
    ) {
      resolvedIcon = React.cloneElement(icon, { color: resolvedColor });
    }

    return (
      <TButtonRaw
        ref={ref}
        {...(variant !== undefined ? { variant: variant as TButtonProps["variant"] } : {})}
        {...(backgroundColor !== undefined ? { backgroundColor } : {})}
        {...(bg !== undefined ? { bg } : {})}
        {...(color !== undefined
          ? { color }
          : resolvedColor !== undefined
            ? { color: resolvedColor }
            : {})}
        {...(resolvedIcon !== undefined ? { icon: resolvedIcon as TButtonProps["icon"] } : {})}
        {...rest}
      />
    );
  },
);
TButtonBase.displayName = "TButton";

// Tipos relaxados: o app passa cores do ThemeColors como string — ver types.ts
export const TButton = TButtonBase as unknown as LooseComponent<TButtonProps>;
