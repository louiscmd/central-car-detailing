import { randomDelay } from "@/lib/utils";
import type { ScrapeResult } from "@/types";
import type { Browser } from "playwright-core";

export async function getBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = await import("@sparticuz/chromium");
    const { chromium: pw } = await import("playwright-core");
    return pw.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}

export const DEFAULT_MIN_DELAY =
  parseInt(process.env.SCRAPE_MIN_DELAY_MS ?? "2000");
export const DEFAULT_MAX_DELAY =
  parseInt(process.env.SCRAPE_MAX_DELAY_MS ?? "5000");
export const RETRY_LIMIT = parseInt(process.env.SCRAPE_RETRY_LIMIT ?? "3");

export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export abstract class BaseScraper {
  protected minDelay: number;
  protected maxDelay: number;
  protected retryLimit: number;

  constructor(
    minDelay = DEFAULT_MIN_DELAY,
    maxDelay = DEFAULT_MAX_DELAY,
    retryLimit = RETRY_LIMIT
  ) {
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
    this.retryLimit = retryLimit;
  }

  abstract scrape(profileUrl: string): Promise<ScrapeResult>;

  protected async withDelay<T>(fn: () => Promise<T>): Promise<T> {
    await randomDelay(this.minDelay, this.maxDelay);
    return fn();
  }

  protected async withRetry(
    fn: () => Promise<ScrapeResult>,
    attempt = 1
  ): Promise<ScrapeResult> {
    try {
      return await fn();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Scrape attempt ${attempt} failed: ${errorMsg}`);

      if (attempt >= this.retryLimit) {
        return { success: false, error: errorMsg };
      }

      // Exponential backoff between retries
      await randomDelay(
        this.minDelay * attempt * 2,
        this.maxDelay * attempt * 2
      );
      return this.withRetry(fn, attempt + 1);
    }
  }

  protected parseNumber(raw: string | null | undefined): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(/[,\s]/g, "").toLowerCase();
    if (cleaned.endsWith("m")) return Math.round(parseFloat(cleaned) * 1_000_000);
    if (cleaned.endsWith("k")) return Math.round(parseFloat(cleaned) * 1_000);
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? null : n;
  }
}
