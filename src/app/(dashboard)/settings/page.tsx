import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN";

  // Fetch clients with their portal user id so admin can target specific clients
  const clients = isAdmin
    ? await prisma.client.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          name: true,
          clientPortal: { select: { userId: true } },
        },
        orderBy: { name: "asc" },
      })
    : [];

  const portalClients = clients.map(c => ({
    id: c.id,
    name: c.name,
    portalUserId: c.clientPortal?.userId ?? null,
  }));

  return <SettingsClient isAdmin={isAdmin} portalClients={portalClients} />;
}
