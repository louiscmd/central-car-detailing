import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientMonthlyReport } from "@/lib/analytics";
import { formatMonthYear } from "@/lib/utils";
import { z } from "zod";
import { sendPushToUser } from "@/lib/push";

const generateSchema = z.object({
  clientId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const where = clientId
    ? { clientId, client: { userId: session.user.id } }
    : { client: { userId: session.user.id } };

  const reports = await prisma.report.findMany({
    where,
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      client: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: reports });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { clientId, month, year } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const reportData = await getClientMonthlyReport(clientId, month, year);

  const report = await prisma.report.upsert({
    where: { clientId_month_year: { clientId, month, year } },
    create: {
      clientId,
      month,
      year,
      title: `${client.name} — ${formatMonthYear(month, year)}`,
      data: JSON.parse(JSON.stringify(reportData)),
    },
    update: {
      data: JSON.parse(JSON.stringify(reportData)),
      updatedAt: new Date(),
    },
  });

  // Notify the client if they have a portal account
  const portal = await prisma.clientPortal.findUnique({
    where: { clientId },
    select: { userId: true },
  });
  if (portal) {
    sendPushToUser(portal.userId, {
      title: "New report available",
      body: `Your ${formatMonthYear(month, year)} report from ${client.name} is ready.`,
      icon: "/icon-192.png",
      url: "/portal/reports",
    }).catch(() => {});
  }

  return NextResponse.json({ data: { report, reportData } }, { status: 201 });
}
