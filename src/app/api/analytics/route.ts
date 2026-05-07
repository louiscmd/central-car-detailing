import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlyAnalytics, getDashboardStats } from "@/lib/analytics";
import { currentMonthYear } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");
  const type = searchParams.get("type") ?? "monthly";

  if (type === "dashboard") {
    const stats = await getDashboardStats(session.user.id);
    return NextResponse.json({ data: stats });
  }

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  // Verify ownership
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, client: { userId: session.user.id } },
  });
  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { month, year } = currentMonthYear();
  const m = monthParam ? parseInt(monthParam) : month;
  const y = yearParam ? parseInt(yearParam) : year;

  const analytics = await getMonthlyAnalytics(accountId, m, y);
  return NextResponse.json({ data: analytics });
}
