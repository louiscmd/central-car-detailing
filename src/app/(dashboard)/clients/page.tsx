import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/clients/platform-badge";
import { formatNumber, formatDate } from "@/lib/utils";
import type { Platform } from "@/types";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const clients = await prisma.client.findMany({
    where: { userId },
    include: {
      accounts: {
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      },
      _count: { select: { accounts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage all your social media clients.
          </p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No clients yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add your first client to start tracking their social media analytics.
            </p>
            <Link href="/clients/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => {
            const totalFollowers = client.accounts.reduce((sum, a) => {
              const f = a.snapshots[0]?.followers;
              return sum + (f ? Number(f) : 0);
            }, 0);

            const lastScrape = client.accounts
              .map((a) => a.snapshots[0]?.date)
              .filter(Boolean)
              .sort()
              .pop();

            return (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold">
                          {client.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {client.name}
                          </h3>
                          {client.isPaused && (
                            <Badge variant="secondary" className="text-xs">
                              Paused
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {client.accounts.map((a) => (
                        <PlatformBadge
                          key={a.id}
                          platform={a.platform as Platform}
                        />
                      ))}
                      {client.accounts.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          No accounts added
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold text-lg">
                          {formatNumber(totalFollowers)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          total followers
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Last scraped
                        </p>
                        <p className="text-xs font-medium">
                          {lastScrape ? formatDate(lastScrape) : "Never"}
                        </p>
                      </div>
                    </div>

                    {client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
