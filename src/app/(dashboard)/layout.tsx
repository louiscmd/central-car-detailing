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

  const clients = await prisma.client.findMany({
    where: { userId: session.user!.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <NextAuthSessionProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col md:ml-64 overflow-hidden">
          <Header
            clients={clients}
            viewAsClientId={null}
            currentClientName={undefined}
            isOwner={true}
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </NextAuthSessionProvider>
  );
}
