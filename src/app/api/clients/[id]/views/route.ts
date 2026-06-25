import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { get7DayViewsForClient } from "@/lib/analytics";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const views = await get7DayViewsForClient(id);
  return NextResponse.json(views);
}
