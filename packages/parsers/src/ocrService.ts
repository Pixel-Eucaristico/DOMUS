import { OCRAdapter } from "./types";
import { parseFromImage, OCRParseResult } from "./ocrParser";

export class OCRService {
  constructor(private adapter: OCRAdapter) {}

  async processImage(imageUri: string): Promise<OCRParseResult> {
    try {
      return await parseFromImage(imageUri, this.adapter);
    } catch (error) {
      console.error("OCR Error:", error);
      throw error;
    }
  }
}
