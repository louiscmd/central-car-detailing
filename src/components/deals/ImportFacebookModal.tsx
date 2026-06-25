"use client";

import { useState, useRef } from "react";
import { X, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import JSZip from "jszip";

interface LeadInput { businessName: string; stage: string; notes: string; phone: string | null; }

// ─── Facebook encoding fix ───────────────────────────────────────────────────
function fixEncoding(str: string): string {
  try {
    const bytes = new Uint8Array(str.split("").map(c => c.charCodeAt(0) & 0xff));
    return new TextDecoder("utf-8").decode(bytes);
  } catch { return str; }
}

// ─── Classification patterns ─────────────────────────────────────────────────
const AUTO_REPLY = [
  /nous vous répondrons dans les plus brefs/i,
  /nous avons reçu votre message et appréci/i,
  /we'll get back to you/i,
  /odpowied[zź] automnatyczna/i,
  /staramy si[eę] odpowiadać jak najszybciej/i,
  /merci de nous avoir contact.*nous vous répondrons/i,
];
const NEGATIVE = [
  /nie jesteśmy zainteresowani/i,
  /nie skorzystamy/i,
  /nie jest.*zainteresow/i,
  /pas intéressé/i,
  /ne sommes pas intéressé/i,
  /not interested/i,
  /ne donneron[st] pas suite/i,
];
const INTERESTED = [
  /spotka[jćc]my/i,
  /możemy się spotkać/i,
  /proszę o wycen/i,
  /prześlij.*ofert/i,
  /porozmawiajmy/i,
  /mój numer/i,
  /rendez-vous/i,
  /please send/i,
  /intéressé.*votre/i,
];

function extractPhone(text: string): string | null {
  const m = text.match(/(\+?[\d\s\-]{9,15})/);
  if (!m) return null;
  const digits = m[1].replace(/\D/g, "");
  return digits.length >= 9 ? m[1].trim() : null;
}

interface MsgEntry { sender_name: string; content?: string; }
interface ConvoData { participants: { name: string }[]; messages: MsgEntry[]; }

function classifyConvo(data: ConvoData): LeadInput | null {
  const participants = data.participants.map(p => fixEncoding(p.name));
  const msgs = data.messages.filter(m => m.content);
  const louisMsgs = msgs.filter(m => m.sender_name.includes("Louis"));
  const bizMsgs = msgs.filter(m => !m.sender_name.includes("Louis"));
  if (!louisMsgs.length) return null;

  const businessName = participants.find(p => !p.includes("Louis")) ?? "Unknown";
  const bizText = bizMsgs.map(m => fixEncoding(m.content ?? "")).join(" ");
  const realBizMsgs = bizMsgs.filter(m => !AUTO_REPLY.some(p => p.test(fixEncoding(m.content ?? ""))));

  let stage: string;
  if (!realBizMsgs.length) {
    stage = "Contacted";
  } else if (NEGATIVE.some(p => p.test(bizText))) {
    stage = "Replied";
  } else if (INTERESTED.some(p => p.test(bizText))) {
    stage = "Interested";
  } else {
    stage = "Replied";
  }

  const lastBizMsg = realBizMsgs[0] ? fixEncoding(realBizMsgs[0].content ?? "").slice(0, 200) : "";
  const allText = bizText + " " + fixEncoding(louisMsgs[louisMsgs.length - 1]?.content ?? "");

  return {
    businessName,
    stage,
    notes: `FB DM outreach. Louis sent ${louisMsgs.length} message(s).${lastBizMsg ? ` Business replied: ${lastBizMsg}` : ""}`,
    phone: extractPhone(allText),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

type Status = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

interface ImportResult { added: number; skipped: number; total: number; }

export function ImportFacebookModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [leads, setLeads] = useState<LeadInput[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const stageCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.stage] = (acc[l.stage] ?? 0) + 1;
    return acc;
  }, {});

  async function handleFile(file: File) {
    setStatus("parsing");
    setError("");
    try {
      const zip = await JSZip.loadAsync(file);
      const parsed: LeadInput[] = [];

      const files = Object.values(zip.files).filter(f =>
        f.name.includes("/messages/inbox/") && f.name.endsWith("message_1.json")
      );

      await Promise.all(files.map(async (f) => {
        try {
          const text = await f.async("string");
          const data: ConvoData = JSON.parse(text);
          const lead = classifyConvo(data);
          if (lead) parsed.push(lead);
        } catch { /* skip malformed */ }
      }));

      setLeads(parsed);
      setStatus("preview");
    } catch {
      setError("Failed to read the zip file. Make sure it's the Facebook export zip.");
      setStatus("error");
    }
  }

  async function handleImport() {
    setStatus("importing");
    try {
      const res = await fetch("/api/deals/import-facebook-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });
      const data: ImportResult = await res.json();
      setResult(data);
      setStatus("done");
    } catch {
      setError("Import failed. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Re-import Facebook Messages</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {status === "idle" && (
          <>
            <p className="text-sm text-muted-foreground">
              Download your Facebook data export (JSON format) and upload the zip file here. New conversations will be added — existing leads won't be duplicated.
            </p>
            <input ref={inputRef} type="file" accept=".zip" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-8 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Upload className="w-5 h-5" />
              Click to select your Facebook export .zip
            </button>
          </>
        )}

        {status === "parsing" && (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Reading conversations…
          </div>
        )}

        {status === "preview" && (
          <>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium">{leads.length} conversations found</p>
              {Object.entries(stageCounts).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stage}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Businesses already in your Deal Tracker will be skipped automatically.</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-sm hover:bg-accent">Cancel</button>
              <button onClick={handleImport} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                Import {leads.length} leads
              </button>
            </div>
          </>
        )}

        {status === "importing" && (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Importing leads…
          </div>
        )}

        {status === "done" && result && (
          <>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{result.added} new leads added</p>
                {result.skipped > 0 && <p className="text-xs text-muted-foreground">{result.skipped} already existed — skipped</p>}
              </div>
            </div>
            <button onClick={() => { onDone(); onClose(); }}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              Done
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <button onClick={() => setStatus("idle")} className="w-full py-2 border border-border rounded-lg text-sm hover:bg-accent">Try again</button>
          </>
        )}
      </div>
    </div>
  );
}
