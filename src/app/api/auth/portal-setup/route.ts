import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ managerUsername: z.string().min(1) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Only client accounts can do this" }, { status: 403 });

  // Don't allow if a portal already exists
  const existing = await prisma.clientPortal.findUnique({ where: { userId: session.user.id } });
  if (existing) return NextResponse.json({ error: "Portal already set up" }, { status: 409 });

  const body = await req.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Manager username required" }, { status: 400 });

  const manager = await prisma.user.findUnique({
    where: { username: parsed.data.managerUsername.replace(/^@/, "") },
    select: { id: true, role: true, name: true },
  });

  if (!manager) return NextResponse.json({ error: "Manager not found" }, { status: 404 });
  if (manager.role !== "USER" && manager.role !== "ADMIN") {
    return NextResponse.json({ error: "That user is not a manager" }, { status: 400 });
  }

  const clientName = session.user.name ?? session.user.email ?? "Client";

  // Create the Client record under the manager, then the ClientPortal for this user
  const client = await prisma.client.create({
    data: {
      name: clientName,
      userId: manager.id,
      clientPortal: {
        create: { userId: session.user.id },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ clientId: client.id });
}
