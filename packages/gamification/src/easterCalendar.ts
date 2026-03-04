/**
 * Utilitários do calendário litúrgico católico.
 * Algoritmo de Páscoa: Meeus/Jones/Butcher (válido para 1900–2099).
 */

/** Retorna a data da Páscoa para o ano informado. */
export function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Retorna { month (1-12), day } para uma data N dias antes/depois da Páscoa.
 * offsetDays negativo = antes da Páscoa, positivo = depois.
 */
export function offsetFromEaster(year: number, offsetDays: number): { month: number; day: number } {
  const easter = computeEaster(year);
  const d = new Date(easter.getTime() + offsetDays * 86_400_000);
  return { month: d.getMonth() + 1, day: d.getDate() };
}

/**
 * Cristo Rei: último domingo do tempo comum, imediatamente antes do 1º Domingo do Advento.
 * Retorna o mês (1-12).
 */
export function christTheKingMonth(year: number): number {
  // Natal = 25/12. Primeiro Domingo do Advento = 4º domingo antes de 25/12.
  const dec25Dow = new Date(year, 11, 25).getDay(); // 0=Dom
  const daysBack = dec25Dow === 0 ? 28 : dec25Dow + 21;
  const firstAdvent = new Date(year, 11, 25 - daysBack);
  const ctk = new Date(firstAdvent.getTime() - 7 * 86_400_000);
  return ctk.getMonth() + 1;
}

/**
 * 1º Domingo do Advento: 4 domingos antes de 25/12.
 * Retorna o mês (1-12) — geralmente novembro ou dezembro.
 */
export function firstAdventMonth(year: number): number {
  const dec25Dow = new Date(year, 11, 25).getDay();
  const daysBack = dec25Dow === 0 ? 28 : dec25Dow + 21;
  const firstAdvent = new Date(year, 11, 25 - daysBack);
  return firstAdvent.getMonth() + 1;
}
