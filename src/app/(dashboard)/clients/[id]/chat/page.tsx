"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FullChatWindow } from "@/components/portal/full-chat-window";

export default function ManagerClientChatPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-3 shrink-0">
        <Link href={`/clients/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Client Chat</h1>
      </div>
      <div className="flex-1 min-h-0">
        <FullChatWindow clientId={id} />
      </div>
    </div>
  );
}
