import { SefazFetcher } from "./types";
import { parseSefazHtml, SefazParseResult } from "./sefazParser";

export class SefazService {
  constructor(private fetcher: SefazFetcher) {}

  async fetchAndParse(url: string): Promise<SefazParseResult> {
    try {
      const html = await this.fetcher.fetchPage(url);
      if (!html) throw new Error("Could not fetch HTML from SEFAZ");
      return parseSefazHtml(html);
    } catch (error) {
      console.error("SEFAZ Fetch error:", error);
      throw new Error("Failed to fetch invoice from SEFAZ");
    }
  }
}
