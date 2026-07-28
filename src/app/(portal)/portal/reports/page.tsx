import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function PortalReportsPage() {
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

  const reports = await prisma.report.findMany({
    where: { clientId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { id: true, title: true, month: true, year: true, pdfUrl: true, createdAt: true },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h2 className="text-xl font-bold">Reports</h2>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <FileText className="w-10 h-10 opacity-30" />
          <p className="text-sm">No reports have been shared yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {reports.map(r => (
            <li key={r.id} className="rounded-xl border border-border bg-card px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{MONTHS[r.month - 1]} {r.year}</p>
              </div>
              {r.pdfUrl ? (
                <a
                  href={r.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Download PDF
                </a>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">No PDF</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
