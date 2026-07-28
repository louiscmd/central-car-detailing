import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, bio, name } = await req.json();

  if (username !== undefined) {
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3–20 characters: letters, numbers, underscores only." },
        { status: 400 }
      );
    }
    const taken = await prisma.user.findFirst({
      where: { username, id: { not: session.user.id } },
    });
    if (taken) return NextResponse.json({ error: "Username already taken." }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(name !== undefined && { name }),
    },
    select: { id: true, username: true, name: true, bio: true, avatarUrl: true },
  });

  return NextResponse.json(updated);
}
