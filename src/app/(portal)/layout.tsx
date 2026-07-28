import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextAuthSessionProvider } from "@/components/layout/session-provider";
import { Header } from "@/components/layout/header";
import { PortalSidebar } from "@/components/layout/portal-sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string; clientId?: string })?.role;
  const sessionClientId = (session.user as { clientId?: string })?.clientId;

  let clientId: string | null = null;
  let clientName = "";
  let isManager = false;
  let managerClients: { id: string; name: string }[] = [];

  if (role === "CLIENT") {
    clientId = sessionClientId ?? null;
    if (!clientId) redirect("/login");
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
    clientName = client?.name ?? "Portal";
  } else {
    isManager = true;
    const jar = await cookies();
    clientId = jar.get("view-as-client")?.value ?? null;
    if (!clientId) redirect("/dashboard");

    managerClients = await prisma.client.findMany({
      where: { userId: session.user!.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    clientName = managerClients.find(c => c.id === clientId)?.name ?? "Client";
  }

  return (
    <NextAuthSessionProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <PortalSidebar clientName={clientName} isManager={isManager} />
        <div className="flex-1 flex flex-col md:ml-56 overflow-hidden">
          <Header
            clients={managerClients}
            viewAsClientId={isManager ? clientId : null}
            currentClientName={clientName}
            isOwner={true}
          />
          {isManager && (
            <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-xs text-amber-500 font-medium">
              <span>👁</span>
              <span>Previewing — {clientName}</span>
            </div>
          )}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </NextAuthSessionProvider>
  );
}
