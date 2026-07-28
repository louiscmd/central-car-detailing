import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AtSign, Users } from "lucide-react";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          sentPartnerships: { where: { status: "ACCEPTED" } },
          receivedPartnerships: { where: { status: "ACCEPTED" } },
        },
      },
    },
  });

  if (!user || user.role === "CLIENT") notFound();

  const partnerCount = user._count.sentPartnerships + user._count.receivedPartnerships;
  const isMe = session?.user?.id === user.id;
  const initials = (user.name ?? user.username ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 text-center">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name ?? user.username ?? ""}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-3xl border-4 border-primary/20">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{user.name ?? user.username}</h1>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mt-0.5">
              <AtSign className="w-3.5 h-3.5" />
              <span className="text-sm">{user.username}</span>
            </div>
          </div>

          {user.bio && (
            <p className="text-sm text-muted-foreground max-w-xs">{user.bio}</p>
          )}

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{partnerCount} {partnerCount === 1 ? "partner" : "partners"}</span>
          </div>
        </div>

        {/* Actions */}
        {!isMe && session && (
          <div className="flex justify-center">
            <a
              href="/partners"
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Connect on Partners page
            </a>
          </div>
        )}

        {isMe && (
          <div className="flex justify-center">
            <a
              href="/settings"
              className="px-5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              Edit profile
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
