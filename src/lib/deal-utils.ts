export const DEFAULT_STAGES = [
  { name: "Not Contacted", position: 0, color: "#94a3b8" },
  { name: "Contacted", position: 1, color: "#60a5fa" },
  { name: "Replied", position: 2, color: "#34d399" },
  { name: "Interested", position: 3, color: "#a78bfa" },
  { name: "Meeting Scheduled", position: 4, color: "#f472b6" },
  { name: "Proposal Sent", position: 5, color: "#fb923c" },
  { name: "Negotiating", position: 6, color: "#fbbf24" },
  { name: "Verbal Yes", position: 7, color: "#4ade80" },
  { name: "Contract Sent", position: 8, color: "#22d3ee" },
  { name: "Client Won", position: 9, color: "#16a34a" },
  { name: "Client Lost", position: 10, color: "#ef4444" },
];

export const LEAD_SOURCES = [
  { value: "INSTAGRAM_DM", label: "Instagram DM" },
  { value: "FACEBOOK_MESSAGE", label: "Facebook Message" },
  { value: "REFERRAL", label: "Referral" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "EMAIL", label: "Email" },
  { value: "WALK_IN", label: "Walk-in Visit" },
  { value: "WEBSITE", label: "Website" },
  { value: "OTHER", label: "Other" },
];

export const ACTIVITY_LABELS: Record<string, string> = {
  CREATED: "Lead added",
  STAGE_CHANGED: "Stage changed",
  NOTE_ADDED: "Note added",
  FOLLOW_UP_SCHEDULED: "Follow-up scheduled",
  FOLLOW_UP_COMPLETED: "Follow-up completed",
  DM_SENT: "DM sent",
  CALLED: "Call made",
  EMAILED: "Email sent",
  MEETING_HELD: "Meeting held",
  PROPOSAL_SENT: "Proposal sent",
  CONTRACT_SENT: "Contract sent",
  WON: "Deal won",
  LOST: "Deal lost",
};

export const ACTIVITY_ICONS: Record<string, string> = {
  CREATED: "✦",
  STAGE_CHANGED: "→",
  NOTE_ADDED: "📝",
  FOLLOW_UP_SCHEDULED: "🔔",
  FOLLOW_UP_COMPLETED: "✅",
  DM_SENT: "💬",
  CALLED: "📞",
  EMAILED: "📧",
  MEETING_HELD: "🤝",
  PROPOSAL_SENT: "📄",
  CONTRACT_SENT: "✍️",
  WON: "🏆",
  LOST: "❌",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-slate-400",
  MEDIUM: "text-blue-400",
  HIGH: "text-amber-400",
  URGENT: "text-red-500",
};

// Automations: when a lead enters these stages, auto-schedule a follow-up
export const STAGE_AUTO_FOLLOWUPS: Record<string, { days: number; note: string; priority: string }> = {
  "Interested": { days: 3, note: "Follow up — lead is interested", priority: "HIGH" },
  "Proposal Sent": { days: 7, note: "Check if proposal was reviewed", priority: "HIGH" },
  "Verbal Yes": { days: 2, note: "Send contract ASAP", priority: "URGENT" },
  "Meeting Scheduled": { days: 1, note: "Prepare for meeting", priority: "HIGH" },
};

// Inactivity warnings (days without activity → message)
export const STAGE_WARNINGS: Record<string, { days: number; message: string }> = {
  "Interested": { days: 10, message: "has been interested for {{days}} days without follow-up" },
  "Proposal Sent": { days: 7, message: "proposal sent {{days}} days ago with no activity" },
  "Verbal Yes": { days: 5, message: "verbal yes received but no contract sent after {{days}} days" },
  "Meeting Scheduled": { days: 3, message: "meeting may have passed with no follow-up action" },
  "Negotiating": { days: 7, message: "has been negotiating for {{days}} days — needs attention" },
};

export function calcExpectedValue(retainer: number, setupFee: number, probability: number): number {
  return Math.round((retainer + setupFee * 0.5) * probability);
}

export function scoreLabel(score: number): "Hot" | "Warm" | "Cold" {
  if (score >= 75) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}

export function scoreBadgeClass(score: number): string {
  if (score >= 75) return "bg-red-500/15 text-red-400 border-red-500/30";
  if (score >= 45) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

export function daysBetween(a: Date | string, b: Date | string = new Date()): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function formatRelative(date: Date | string): string {
  const d = daysBetween(date);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export function formatDueDate(date: Date | string): { label: string; urgent: boolean; overdue: boolean } {
  const d = daysBetween(new Date(), date);
  const overdue = d < 0;
  const urgent = d >= 0 && d <= 1;
  if (overdue) return { label: `${Math.abs(d)}d overdue`, urgent: true, overdue: true };
  if (d === 0) return { label: "Due today", urgent: true, overdue: false };
  if (d === 1) return { label: "Due tomorrow", urgent: true, overdue: false };
  return { label: `Due in ${d}d`, urgent: false, overdue: false };
}
