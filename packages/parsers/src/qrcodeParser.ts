const SEFAZ_URL_PATTERN = /https?:\/\/(?:www\.)?(?:nfce\.)?(?:\w+\.)?(?:sefaz|fazenda|nfce)\.\w+\.gov\.br\S*/i;
const CHAVE_ACESSO_PATTERN = /(?:chNFe|p)=(\d{44})/;

export interface QRCodeData {
  url: string;
  chaveAcesso: string | null;
}

export function parseNFCeQRCode(rawData: string): QRCodeData | null {
  const trimmed = rawData.trim();

  const urlMatch = trimmed.match(SEFAZ_URL_PATTERN);
  if (!urlMatch) {
    if (/^https?:\/\//.test(trimmed) && trimmed.includes("nfce")) {
      return {
        url: trimmed,
        chaveAcesso: extractChaveAcesso(trimmed),
      };
    }
    return null;
  }

  const url = urlMatch[0];
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
