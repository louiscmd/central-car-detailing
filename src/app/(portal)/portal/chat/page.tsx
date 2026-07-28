import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { FullChatWindow } from "@/components/portal/full-chat-window";

export default async function PortalChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as { role?: string; clientId?: string })?.role;
  let clientId: string | null = null;

  if (role === "CLIENT") {
    clientId = (session.user as { clientId?: string })?.clientId ?? null;
  } else {
    const jar = await cookies();
    clientId = jar.get("view-as-client")?.value ?? null;
  }

  if (!clientId) redirect("/dashboard");

  return (
    <div className="h-full flex flex-col gap-3">
      <h2 className="text-xl font-bold shrink-0">Chat</h2>
      <div className="flex-1 min-h-0">
        <FullChatWindow clientId={clientId} />
      </div>
    </div>
  );
}
