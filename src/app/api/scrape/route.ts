import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeAndSave } from "@/scrapers";

export const maxDuration = 60;

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { accountId, clientId } = body as {
    accountId?: string;
    clientId?: string;
  };

  // Scrape a single account
  if (accountId) {
    // Verify ownership
    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, client: { userId: session.user.id } },
    });
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await scrapeAndSave(accountId);
    return NextResponse.json({ data: result });
  }

  // Scrape all accounts for a client
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: session.user.id },
      include: { accounts: { where: { isPaused: false } } },
    });
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const results = await Promise.allSettled(
      client.accounts.map((a) => scrapeAndSave(a.id))
    );

    const summary = results.map((r, i) => ({
      accountId: client.accounts[i].id,
      platform: client.accounts[i].platform,
      success: r.status === "fulfilled" ? r.value.success : false,
      error:
        r.status === "rejected"
          ? String(r.reason)
          : r.status === "fulfilled"
          ? r.value.error
          : undefined,
    }));

    return NextResponse.json({ data: summary });
  }

  return NextResponse.json({ error: "accountId or clientId required" }, { status: 400 });
}
