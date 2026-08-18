import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextAuthSessionProvider } from "@/components/layout/session-provider";
import { Header } from "@/components/layout/header";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import { UsernamePrompt } from "@/components/layout/username-prompt";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string; clientId?: string })?.role;
  if (role !== "CLIENT") redirect("/dashboard");

  const clientId = (session.user as { clientId?: string })?.clientId;

  let clientName = "Portal";
  let hasAnalytics = false;
  if (clientId) {
    const [client, portal] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId }, select: { name: true } }),
      prisma.clientPortal.findUnique({
        where: { clientId },
        select: { analyticsPermissions: { select: { id: true }, take: 1 } },
      }),
    ]);
    clientName = client?.name ?? "Portal";
    hasAnalytics = (portal?.analyticsPermissions?.length ?? 0) > 0;
  }

  return (
    <NextAuthSessionProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <PortalSidebar clientName={clientName} hasAnalytics={hasAnalytics} />
        <div className="flex-1 flex flex-col md:ml-56 overflow-hidden">
          <Header />
          <UsernamePrompt />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </NextAuthSessionProvider>
  );
}
