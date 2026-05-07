import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { scrapeAndSave } from "@/scrapers";
import { randomDelay } from "@/lib/utils";

const DAILY_CRON = process.env.CRON_DAILY_SCRAPE ?? "0 3 * * *";
// Stagger delay between accounts (ms) to avoid simultaneous requests
const ACCOUNT_STAGGER_MS = 5000;

export function startScheduler() {
  console.log(`[Scheduler] Starting — daily scrape cron: ${DAILY_CRON}`);

  cron.schedule(DAILY_CRON, async () => {
    console.log("[Scheduler] Daily scrape triggered");
    await runDailyScrape();
  });
}

export async function runDailyScrape() {
  const accounts = await prisma.socialAccount.findMany({
    where: { isPaused: false, client: { isPaused: false } },
    select: { id: true, platform: true, username: true },
  });

  console.log(`[Scheduler] Scraping ${accounts.length} accounts`);

  for (const account of accounts) {
    try {
      console.log(
        `[Scheduler] Scraping ${account.platform}:${account.username} (${account.id})`
      );

      const result = await scrapeAndSave(account.id);

      if (result.success) {
        console.log(`[Scheduler] ✓ ${account.platform}:${account.username}`);
      } else {
        console.warn(
          `[Scheduler] ✗ ${account.platform}:${account.username} — ${result.error}`
        );
      }
    } catch (err) {
      console.error(
        `[Scheduler] Error scraping ${account.id}:`,
        err instanceof Error ? err.message : err
      );
    }

    // Stagger requests to avoid hammering platforms
    await randomDelay(ACCOUNT_STAGGER_MS, ACCOUNT_STAGGER_MS * 2);
  }

  console.log("[Scheduler] Daily scrape complete");
}
