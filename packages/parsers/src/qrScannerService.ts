import { isValidSefazUrl, parseNFCeQRCode } from "./qrcodeParser";

export class QRScannerService {
  validate(qrData: string): boolean {
    const parsed = parseNFCeQRCode(qrData);
    return !!parsed && isValidSefazUrl(parsed.url);
  }

  extractUrl(qrData: string): string | null {
    const parsed = parseNFCeQRCode(qrData);
    return parsed?.url ?? null;
  }
}
