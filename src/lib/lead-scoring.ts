import { prisma } from "@/lib/prisma";

export async function calcScore(leadId: string): Promise<number> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      stage: true,
      activities: { orderBy: { createdAt: "desc" }, take: 1 },
      followUps: { where: { completed: false }, orderBy: { dueDate: "asc" }, take: 1 },
    },
  });
  if (!lead) return 0;

  let score = 0;

  // Stage advancement (0–35 pts): won/lost are excluded from scoring
  const pos = lead.stage.position;
  if (pos < 9) score += Math.round((pos / 8) * 35);

  // Recent activity (0–25 pts)
  if (lead.activities[0]) {
    const days = (Date.now() - new Date(lead.activities[0].createdAt).getTime()) / 86400000;
    if (days < 1) score += 25;
    else if (days < 3) score += 20;
    else if (days < 7) score += 12;
    else if (days < 14) score += 5;
    else score -= 10; // stale penalty
  }

  // Has upcoming follow-up (+10)
  if (lead.followUps[0] && new Date(lead.followUps[0].dueDate) >= new Date()) score += 10;

  // Contact info completeness (0–15 pts)
  if (lead.phone) score += 5;
  if (lead.email) score += 5;
  if (lead.instagram) score += 5;

  // Revenue potential (0–15 pts)
  if (lead.expectedRetainer > 2000) score += 15;
  else if (lead.expectedRetainer > 1000) score += 10;
  else if (lead.expectedRetainer > 500) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
