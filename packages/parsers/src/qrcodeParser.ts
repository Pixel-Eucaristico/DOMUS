const SEFAZ_URL_PATTERN = /https?:\/\/(?:www\.)?(?:nfce\.)?(?:\w+\.)?(?:sefaz|fazenda|nfce|receita)\.\w+\.gov\.br\S*/i;
const CHAVE_ACESSO_PATTERN = /(?:chNFe|p|chAcesso|p)=([0-9]{44})/;

export interface QRCodeData {
  url: string;
  chaveAcesso: string | null;
}

/**
 * Promove URLs `http://` da SEFAZ para `https://` (D18 / Android 16 target 36
 * bloqueia tráfego cleartext no WebView sem `usesCleartextTraffic`).
 */
export function upgradeSefazHttpToHttps(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

export function parseNFCeQRCode(rawData: string): QRCodeData | null {
  const trimmed = rawData.trim();

  const urlMatch = trimmed.match(SEFAZ_URL_PATTERN);
  if (!urlMatch) {
    if (/^https?:\/\//i.test(trimmed) && trimmed.toLowerCase().includes("nfce")) {
      const upgraded = upgradeSefazHttpToHttps(trimmed);
      return {
        url: upgraded,
        chaveAcesso: extractChaveAcesso(upgraded),
      };
    }
    return null;
  }

  const url = upgradeSefazHttpToHttps(urlMatch[0]);
  return {
    url,
    chaveAcesso: extractChaveAcesso(url),
  };
}

function extractChaveAcesso(url: string): string | null {
  const match = url.match(CHAVE_ACESSO_PATTERN);
  return match?.[1] ?? null;
}

export function isValidSefazUrl(url: string): boolean {
  return SEFAZ_URL_PATTERN.test(url) || (url.startsWith("http") && url.includes("nfce"));
}

export function extractUrlFromQRData(data: string): string | null {
  const parsed = parseNFCeQRCode(data);
  return parsed?.url ?? null;
}
