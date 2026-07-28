import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NextAuthSessionProvider } from "@/components/layout/session-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string })?.role;
  if (role === "CLIENT") redirect("/portal");

  const isOwner = role === "ADMIN";

  // Owner can still use perspective switcher; clear stale cookie for non-owners
  const jar = await cookies();
  const viewAsClientId = isOwner ? (jar.get("view-as-client")?.value ?? null) : null;

  const clients = isOwner
    ? await prisma.client.findMany({
        where: { userId: session.user!.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const currentClientName = viewAsClientId
    ? clients.find(c => c.id === viewAsClientId)?.name
    : undefined;

  return (
    <NextAuthSessionProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-64 overflow-hidden">
          <Header
            clients={clients}
            viewAsClientId={viewAsClientId}
            currentClientName={currentClientName}
            isOwner={isOwner}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </NextAuthSessionProvider>
  );
}
