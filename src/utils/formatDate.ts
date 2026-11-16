/**
 * Formata uma string de data ISO (`YYYY-MM-DD`, `YYYY-MM-DDT...` ou `YYYY-MM-DD HH:MM:SS`)
 * para o padrão pt-BR (`DD/MM/AAAA`) usando parse textual direto e validação de calendário UTC
 * para evitar deslocamento de dia por fuso horário.
 */
export function formatDatePtBr(dateStr: string): string {
  if (typeof dateStr !== "string" || !dateStr) return "";
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  const utc = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
  if (
    utc.getUTCFullYear() !== yearNum ||
    utc.getUTCMonth() !== monthNum - 1 ||
    utc.getUTCDate() !== dayNum
  ) {
    return dateStr;
  }
  return `${day}/${month}/${year}`;
}
