import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PartnerChat } from "@/components/portal/partner-chat";

export default async function DashboardChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="h-full flex flex-col gap-3">
      <h2 className="text-xl font-bold shrink-0">Chat</h2>
      <div className="flex-1 min-h-0">
        <PartnerChat />
      </div>
    </div>
  );
}
