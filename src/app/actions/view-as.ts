"use server";

import { cookies } from "next/headers";

export async function setViewAsClient(clientId: string | null) {
  const jar = await cookies();
  if (clientId) {
    jar.set("view-as-client", clientId, { path: "/", maxAge: 60 * 60 * 24 });
  } else {
    jar.delete("view-as-client");
  }
}
