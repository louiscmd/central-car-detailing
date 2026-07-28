import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { ChatWindow } from "@/components/portal/chat-window";

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

  const userId = session.user.id!;
  const userName = session.user.name ?? "You";

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Chat</h2>
      <ChatWindow clientId={clientId} currentUserId={userId} currentUserName={userName} />
    </div>
  );
}
