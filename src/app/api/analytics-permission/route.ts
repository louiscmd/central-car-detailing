import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/analytics-permission?clientId=... → list permissions for a client's portal
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");

  const role = (session.user as { role?: string; clientId?: string })?.role;

  // CLIENT: get their own permissions
  if (role === "CLIENT") {
    const myClientId = (session.user as { clientId?: string })?.clientId;
    const portal = await prisma.clientPortal.findUnique({
      where: { clientId: myClientId ?? "" },
      select: {
        analyticsPermissions: {
          select: {
            id: true,
            accountId: true,
            account: { select: { platform: true, username: true, displayName: true } },
            grantedAt: true,
          },
        },
      },
    });
    return NextResponse.json(portal?.analyticsPermissions ?? []);
  }

  // Manager: get permissions for a specific client
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const portal = await prisma.clientPortal.findUnique({
    where: { clientId },
    select: {
      id: true,
      analyticsPermissions: {
        select: {
          id: true,
          accountId: true,
          account: { select: { platform: true, username: true, displayName: true } },
          grantedAt: true,
        },
      },
    },
  });

  return NextResponse.json(portal ? { portalId: portal.id, permissions: portal.analyticsPermissions } : null);
}

// POST /api/analytics-permission — grant access to a list of accounts
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string })?.role;
  if (role !== "USER" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { portalId, accountIds } = await req.json() as { portalId: string; accountIds: string[] };
  if (!portalId || !Array.isArray(accountIds)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Verify manager owns the portal's client
  const portal = await prisma.clientPortal.findUnique({
    where: { id: portalId },
    select: { client: { select: { userId: true } } },
  });
  if (!portal || portal.client.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete all existing, then re-create
  await prisma.analyticsPermission.deleteMany({ where: { portalId } });
  if (accountIds.length > 0) {
    await prisma.analyticsPermission.createMany({
      data: accountIds.map(accountId => ({ portalId, accountId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true });
}
