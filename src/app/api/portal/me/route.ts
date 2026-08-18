import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string; clientId?: string })?.role;
  if (role !== "CLIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const clientId = (session.user as { clientId?: string })?.clientId;
  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, notes: true, tags: true, createdAt: true },
  });

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  return NextResponse.json(client);
}
