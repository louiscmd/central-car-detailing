import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string; clientId?: string })?.role;
  let clientId: string | null = null;

  if (role === "CLIENT") {
    clientId = (session.user as { clientId?: string })?.clientId ?? null;
  } else {
    const jar = await cookies();
    clientId = jar.get("view-as-client")?.value ?? null;
  }

  if (!clientId) return NextResponse.json({ error: "No client context" }, { status: 400 });

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, notes: true, tags: true, createdAt: true },
  });

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  return NextResponse.json(client);
}
