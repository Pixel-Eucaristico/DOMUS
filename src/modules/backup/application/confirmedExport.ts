/**
 * Roda a exportação só depois da confirmação do usuário.
 * Separado do hook para ser testável sem react-native.
 */
export async function runIfConfirmed(
  askConfirmation: () => Promise<boolean>,
  run: () => Promise<void>,
): Promise<"done" | "cancelled"> {
  if (!(await askConfirmation())) return "cancelled";
  await run();
  return "done";
}

export const PLAIN_EXPORT_WARNING = {
  title: "Exportar sem criptografia?",
  message:
    "O arquivo terá todos os seus dados financeiros legíveis, inclusive o salário e o empregador dos holerites, e, em seguida, abre o compartilhamento (Drive, e-mail, WhatsApp…). Qualquer pessoa ou serviço que receber o arquivo poderá ler tudo. Prefira o backup criptografado com senha.",
  confirmLabel: "Exportar mesmo assim",
} as const;
