"use server";

import { cookies } from "next/headers";

export async function setViewAsClient(clientId: string | null) {
  const jar = await cookies();
  if (clientId) {
    jar.set("view-as-client", clientId, { path: "/" }); // session cookie — clears on browser close
  } else {
    jar.delete("view-as-client");
  }
}
