import type * as React from "react";

/**
 * Tipos relaxados para os wrappers Tamagui (TText/TButton/TCard/TInput).
 *
 * O DOMUS usa um sistema de temas próprio (ThemeColors) e passa cores como
 * string (`color={theme.textColor}`), enquanto os componentes `styled()` do
 * Tamagui tipam cores/tokens como `GetThemeValueForKey<...>` — o que gerava
 * ~320 erros TS2322 falsos em todo o app. Estes tipos mantêm as variantes
 * dos wrappers tipadas e aceitam qualquer prop de estilo via index signature
 * (o Tamagui aceita valores arbitrários em runtime normalmente).
 */
type LooseProps = {
  children?: React.ReactNode;
  /** Aceita qualquer prop de estilo/evento suportada pelo Tamagui em runtime */
  [key: string]: unknown;
};

export type TTextProps = LooseProps & {
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
  secondary?: boolean;
  bold?: boolean;
};

export type TButtonProps = LooseProps & {
  variant?: "primary" | "outline" | "danger" | "ghost";
  onPress?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export type TCardProps = LooseProps & {
  elevated?: boolean;
  compact?: boolean;
};

export type TInputProps = LooseProps & {
  search?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
};

/** Componente com props relaxadas que ainda aceita `ref`. */
export type LooseComponent<P> = React.ComponentType<P & { ref?: unknown }>;
