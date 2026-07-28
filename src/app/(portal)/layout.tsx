import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextAuthSessionProvider } from "@/components/layout/session-provider";
import { Header } from "@/components/layout/header";
import { PortalSidebar } from "@/components/layout/portal-sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string; clientId?: string })?.role;

  // Portal is exclusively for CLIENT users
  if (role !== "CLIENT") redirect("/dashboard");

  const clientId = (session.user as { clientId?: string })?.clientId;
  if (!clientId) redirect("/login");

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { name: true },
  });

  const clientName = client?.name ?? "Portal";

  return (
    <NextAuthSessionProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <PortalSidebar clientName={clientName} isManager={false} />
        <div className="flex-1 flex flex-col md:ml-56 overflow-hidden">
          <Header clients={[]} viewAsClientId={null} currentClientName={clientName} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </NextAuthSessionProvider>
  );
}
