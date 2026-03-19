import { styled, Input } from "tamagui";

/**
 * Input estilizado DOMUS com Tamagui.
 * Substitui TextInput + StyleSheet padrão.
 *
 * Uso:
 *   <TInput placeholder="Nome" value={name} onChangeText={setName} />
 *   <TInput variant="search" placeholder="Buscar..." />
 */
export const TInput = styled(Input, {
  fontFamily: "$body",
  fontSize: "$5", // 14px
  color: "$color",
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
