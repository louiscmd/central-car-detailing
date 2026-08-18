import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3 } from "lucide-react";
import { PortalAnalyticsClient } from "@/components/portal/portal-analytics-client";

export default async function PortalAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string; clientId?: string })?.role;
  if (role !== "CLIENT") redirect("/dashboard");
  const clientId = (session.user as { clientId?: string })?.clientId;
  if (!clientId) redirect("/dashboard");

  const portal = await prisma.clientPortal.findUnique({
    where: { clientId },
    select: {
      analyticsPermissions: {
        select: {
          accountId: true,
          account: {
            select: {
              id: true,
              platform: true,
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  const accounts = portal?.analyticsPermissions.map(p => p.account) ?? [];

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center text-muted-foreground gap-3">
        <BarChart3 className="w-10 h-10 opacity-30" />
        <p className="text-sm">No analytics access granted yet.</p>
        <p className="text-xs">Your manager will share analytics when ready.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">Read-only view of your account performance.</p>
      </div>
      <PortalAnalyticsClient accounts={accounts} />
    </div>
  );
}
