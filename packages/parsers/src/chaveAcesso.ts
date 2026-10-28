/**
 * Chave de acesso da NF-e/NFC-e (44 posições, a última é o dígito verificador).
 *
 * DV pelo módulo 11 do Manual de Orientação do Contribuinte: pesos 2 a 9 da
 * direita para a esquerda sobre as 43 primeiras posições; resto 0 ou 1 → DV 0,
 * senão 11 − resto. Cada posição vale o código ASCII − 48 ("0"→0 … "9"→9),
 * a mesma regra do CNPJ alfanumérico, então a conta já serve se a chave
 * passar a ter letras na parte do CNPJ.
 */
export const CHAVE_ACESSO_LENGTH = 44;

/** DV esperado para as 43 primeiras posições, ou null se o formato não confere. */
export function chaveAcessoCheckDigit(first43: string): number | null {
  if (!/^[0-9A-Z]{43}$/.test(first43)) return null;
  let sum = 0;
  let weight = 2;
  for (let i = first43.length - 1; i >= 0; i--) {
    sum += (first43.charCodeAt(i) - 48) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const r = sum % 11;
  return r < 2 ? 0 : 11 - r;
}

/** A chave tem 44 posições e o DV confere. */
export function isValidChaveAcesso(chave: string): boolean {
  if (typeof chave !== "string" || !/^[0-9A-Z]{43}\d$/.test(chave)) return false;
  return chaveAcessoCheckDigit(chave.slice(0, 43)) === Number(chave[43]);
}
