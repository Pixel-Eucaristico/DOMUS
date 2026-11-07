// Utilitários de processamento e extração de códigos para o leitor de QR Code (Story 4.4).
// Módulo puro sem dependências nativas para execução e testes diretos no Vitest.

/**
 * Extrai e normaliza o código escaneado via QR Code (Story 4.4).
 * - Remove prefixo "domus://" (case-insensitive)
 * - Converte para maiúsculas e remove espaços nas pontas
 * - Aceita segredos completos do Grupo forte (79+ caracteres)
 * - Aceita códigos de pareamento com no mínimo 4 caracteres (para validação/recusa instrutiva)
 * - Retorna null para dados nulos, não-strings, vazios ou com menos de 4 caracteres
 */
export function extractScannedCode(data: unknown): string | null {
  if (typeof data !== "string") return null;
  const trimmed = data.trim();
  if (!trimmed) return null;

  let code = trimmed;
  if (code.toLowerCase().startsWith("domus://")) {
    code = code.slice("domus://".length).trim();
  }
  if (!code) return null;

  const upper = code.toUpperCase();
  if (upper.length < 4) return null;

  return upper;
}
