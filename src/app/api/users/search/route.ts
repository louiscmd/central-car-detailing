import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase().replace(/^@/, "");
  if (!q || q.length < 2) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        { role: { not: "CLIENT" } },
        {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: { id: true, username: true, name: true, avatarUrl: true },
    take: 10,
  });

  return NextResponse.json(users);
}
