import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function randomPassword(len = 16) {
  const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz23456789!@#$%";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== "USER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: clientId } = await params;

  const { email } = await req.json() as { email?: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
    select: { id: true, name: true },
  });

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Check if already invited
  const existing = await prisma.clientPortal.findUnique({
    where: { clientId: client.id },
    include: { user: { select: { email: true } } },
  });

  if (existing) {
    return NextResponse.json({
      alreadyInvited: true,
      email: existing.user.email,
    });
  }

  const tempPassword = randomPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const portalUser = await prisma.user.create({
    data: {
      name: client.name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: "CLIENT",
      clientPortal: {
        create: { clientId: client.id },
      },
    },
    select: { id: true, email: true },
  });

  // Seed default channels
  await prisma.channel.createMany({
    data: [
      { clientId: client.id, name: "general", createdById: session.user.id },
      { clientId: client.id, name: "reports", createdById: session.user.id },
      { clientId: client.id, name: "content", createdById: session.user.id },
    ],
    skipDuplicates: true,
  });

  return NextResponse.json({
    success: true,
    email: portalUser.email,
    tempPassword,
  }, { status: 201 });
}
