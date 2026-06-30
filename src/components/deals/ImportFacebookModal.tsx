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

// Definitively automated — strip from "real" reply count entirely
const AUTO_REPLY_EXPLICIT = [
  /odpowied[zź] automatyczna/i,
  /wiadomość automatyczna/i,
  /odpowiadamy automatycznie/i,
  /staramy si[eę] odpowiadać jak najszybciej/i,
  /nous vous répondrons dans les plus brefs/i,
  /nous avons reçu votre message et appréci/i,
  /merci de nous avoir contact.*nous vous répondrons/i,
  /réponse automatique/i,
  /message automatique/i,
  /auto.?reply/i,
  /automated.?response/i,
  /out of office/i,
  /we.ll get back to you/i,
  /we will get back to you/i,
  /this is an automated/i,
];

// Human-sounding but zero-engagement filler
const POLITE_GENERIC = [
  /bardzo dziękujemy/i,
  /dziękujemy za (zainteresowanie|kontakt|wiadomość|napisanie)/i,
  /dzięki za (wiadomość|kontakt)/i,
  /skontaktujemy się (z państwem|wkrótce|niedługo)/i,
  /odezwiemy się (wkrótce|niedługo|do ciebie|do was)/i,
  /wrócimy do (ciebie|was) (wkrótce|niebawem)/i,
  /odpiszemy (wkrótce|niedługo|jak najszybciej)/i,
  /zapraszamy (serdecznie )?(do nas|do restauracji|na wizyt|na miejsce|do odwiedzenia)/i,
  /zapraszamy na (obiad|kolację|śniadanie|wizytę)/i,
  /merci (beaucoup|pour votre message|de nous avoir)/i,
  /nous vous contacterons/i,
  /on revient vers vous/i,
  /nous prendrons contact/i,
  /thank you for (your message|contacting|reaching out|your interest)/i,
  /we.ll be in touch/i,
  /we appreciate your (interest|message|contact)/i,
  /we.ve received your (message|inquiry)/i,
];

// Clear verbal agreement — they said yes before any contract/payment
const VERBAL_YES = [
  // Polish
  /zróbmy to/i,
  /tak,? (chcemy|chciałbym|chciałabym|chcę)/i,
  /(chcemy|chciałbym|jesteśmy gotowi) (z tobą |z wami )?(pracować|współpracować|zacząć|rozpocząć)/i,
  /wyślij (mi |nam )?(umowę|kontrakt|fakturę|ofertę do podpisania)/i,
  /zgadzamy się/i,
  /jesteśmy (na tak|gotowi do)/i,
  /zaczynamy/i,
  // English
  /let.s (do it|get started|begin|go ahead|move forward)/i,
  /we.d (love|like) to (proceed|work (with you|together)|start|get started)/i,
  /i.m (in\b|ready to (start|proceed|begin))/i,
  /send (me |us )?(the )?(contract|invoice|agreement|proposal to sign)/i,
  /we.re (on board|ready to (start|go|proceed))/i,
  /yes[,!]?\s*(let.s|we.d|i.m|please|send)/i,
  // French
  /on y va/i,
  /c.est (bon|d.accord|parfait)[,.!]?\s*(pour nous|envoyez|on commence)/i,
  /envoyez.?(moi|nous) (le contrat|la facture|votre offre)/i,
  /on (est )?(prêt|partant|d.accord)/i,
  /on commence (quand|lundi|maintenant)/i,
];

// Confirmed specific meeting/call (time agreed, not just discussing possibility)
const MEETING_SCHEDULED = [
  // Polish — specific time or booking confirmation
  /umówmy się (na|w|o)/i,
  /umawiam(y)? się/i,
  /(poniedziałek|wtorek|środę|czwartek|piątek|sobotę|niedzielę).{0,25}(godzin|ok\.|o \d|\d{1,2}:\d{2})/i,
  /\d{1,2}:\d{2}.{0,15}(mogę|pasuje|ok)/i,
  /oto (mój )?(calendly|link do spotkania)/i,
  // English — specific time/booking
  /book me in/i,
  /here.s my (calendly|cal\.com|scheduling link)/i,
  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday).{0,20}(works?|at \d|ok\.?$)/i,
  /\d{1,2}(:\d{2})?\s?(am|pm).{0,20}(works?|good|fine|ok)/i,
  /let.s (jump|hop) on a call/i,
  /i.ve (booked|scheduled|set up) (a |the )?(call|meeting)/i,
  // French — specific time/booking
  /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche).{0,20}(ça marche|c.est bon|ok)/i,
  /je suis disponible (lundi|mardi|mercredi|jeudi|vendredi|ce)/i,
  /rendez-vous (lundi|mardi|mercredi|jeudi|vendredi|ce|le \d)/i,
  /voici mon (calendly|lien|numéro)/i,
];

// Explicit disinterest
const NEGATIVE = [
  // Polish
  /nie jesteśmy zainteresowani/i,
  /nie skorzystamy/i,
  /nie (jestem|jesteśmy) zainteresow/i,
  /nie (potrzebujemy|korzystamy) (z tego|z takich|takich)/i,
  /dziękujemy,? ale nie/i,
  /nie,? dziękujem/i,
  /już (współpracujemy|mamy kogoś|korzystamy z)/i,
  /mamy już (kogoś|agencję|osobę)/i,
  // French
  /pas intéressé/i,
  /ne sommes pas intéressé/i,
  /ne donneron[st] pas suite/i,
  /ça ne nous intéresse pas/i,
  /on travaille déjà avec/i,
  /on a déjà quelqu.un/i,
  // English
  /not interested/i,
  /no thank(s| you)/i,
  /not (looking|needed|required)/i,
  /we already (have|work with) (someone|an agency)/i,
  /we.re (good|all set|not looking)/i,
  /please (stop|remove|unsubscribe)/i,
];

// Genuine buying interest signals (pricing, portfolio, more info, etc.)
const INTERESTED = [
  // Portfolio / examples — Polish
  /prześlij (przykłady|portfolio|realizacje|próbki)/i,
  /pokaż (przykłady|portfolio|realizacje|poprzednie prace)/i,
  /przykłady (twoich|waszych)? ?(prac|realizacji|zdjęć|postów|filmów|contentu)/i,
  /jakie (masz|macie) (przykłady|realizacje|portfolio)/i,
  /czy (możesz|mógłbyś|moglibyście) (pokazać|przesłać|wysłać) (przykłady|portfolio)/i,
  /wyślij.*portfolio/i,
  /wyślij.*przykład/i,
  /pokaż.*co (robiłeś|robicie|zrobiłeś)/i,
  /z czym (już )?(pracowałeś|pracowaliście)/i,
  /jakie (restauracje|miejsca|klientów) (już )?(obsługujesz|prowadzisz|masz)/i,
  // Portfolio / examples — English
  /send (me )?(your )?(examples|portfolio|samples|previous work|work samples)/i,
  /can (you|i) (send|show) (me )?(some )?(examples|portfolio|samples|your work)/i,
  /could you (send|show|share) (me )?(some )?(examples|portfolio|samples|your work)/i,
  /show me (your work|examples|portfolio|what you.ve done|what you do|your content)/i,
  /can i see (your work|some examples|your portfolio|what you.ve done|your content)/i,
  /i.d (love|like) to see (some|your)? ?(examples|work|content|portfolio|samples)/i,
  /do you have (any )?(examples|a portfolio|samples|previous work|case studies)/i,
  /share (some|your|a few)? ?(examples|work|content|samples|portfolio)/i,
  /what (does your|kind of) (work|content) (look like|do you (create|make|produce|do))/i,
  /what have you (created|done|made|produced) (before|for others|for (restaurants|clients))/i,
  /what.s your (portfolio|work look like|previous work|experience like)/i,
  // Portfolio / examples — French
  /envoy.*exemples/i,
  /montrez.moi (vos|votre)/i,
  /exemples de (vos|votre) travaux/i,
  /avez.vous (des exemples|un portfolio)/i,
  /pouvez.vous (montrer|envoyer|partager)/i,
  /vous avez (des exemples|un portfolio|des réalisations)/i,
  // Pricing — Polish/French/English
  /ile (to )?(kosztuje|jest|wynosi|by kosztowało)/i,
  /jaka (jest )?(cena|stawka|wycena|opłata|kwota)/i,
  /cennik/i,
  /proszę o wycen/i,
  /ile za (miesiąc|obsługę|pakiet|współprac)/i,
  /co (wchodzi|jest) w (pakiecie|ofercie|skład)/i,
  /jakie (są|macie) pakiet/i,
  /combien.*(coûte|ça coûte)/i,
  /quel est le (prix|tarif|coût)/i,
  /how much (does|is|would) (it|this)/i,
  /pricing/i,
  /what do you charge/i,
  // Discussing possibility of meeting/call (not yet confirmed)
  /możemy (pogadać|porozmawiać|się spotkać)/i,
  /porozmawiajmy/i,
  /zadzwoń (do mnie|proszę)/i,
  /mój numer/i,
  /napisz na (maila|email)/i,
  /appelez.moi/i,
  /let.s (meet|talk|chat|connect)/i,
  /call me/i,
  /can we (talk|chat|meet|speak)/i,
  // Proposals / offers
  /prześlij.*ofert/i,
  /wyślij.*ofert/i,
  /proszę (o|przesłać) ofert/i,
  /send (me )?(a )?(proposal|offer|quote)/i,
  // Explicit interest
  /jestem (zainteresow|otwart)/i,
  /jesteśmy (zainteresow|otwart)/i,
  /interesuje (mnie|nas) (współpraca|temat|oferta)/i,
  /chętnie (bym|się dowiedział|porozmawiał)/i,
  /brzmi (interesująco|dobrze|ciekawie)/i,
  /je suis intéressé/i,
  /ça m.intéresse/i,
  /intéressé par (votre|cette)/i,
  /tell me more/i,
  /more (information|info|details)/i,
  /sounds (good|great|interesting)[,!.]? ?(can you|could you|please)/i,
  /interested[,!.]? ?(can you|could you|please)? ?(send|show|share)/i,
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

  // Strip explicit auto-replies first
  const realBizMsgs = bizMsgs.filter(
    m => !AUTO_REPLY_EXPLICIT.some(p => p.test(fixEncoding(m.content ?? "")))
  );

  // Check if all remaining replies are just polite generic filler with no real engagement
  const onlyPoliteGeneric =
    realBizMsgs.length > 0 &&
    realBizMsgs.every(m => POLITE_GENERIC.some(p => p.test(fixEncoding(m.content ?? ""))));

  const realBizText = realBizMsgs.map(m => fixEncoding(m.content ?? "")).join(" ");

  let stage: string;
  if (!realBizMsgs.length) {
    stage = "Contacted";
  } else if (VERBAL_YES.some(p => p.test(realBizText))) {
    stage = "Verbal yes";
  } else if (MEETING_SCHEDULED.some(p => p.test(realBizText))) {
    stage = "Meeting / call scheduled";
  } else if (INTERESTED.some(p => p.test(realBizText))) {
    // Check before polite-generic — a message can be polite AND ask for examples
    stage = "Positive reply";
  } else if (NEGATIVE.some(p => p.test(realBizText))) {
    stage = "Negative reply";
  } else {
    // Generic replies, polite filler, or unclear — no buying signal
    stage = "Contacted";
  }

  const lastBizMsg = realBizMsgs[0] ? fixEncoding(realBizMsgs[0].content ?? "").slice(0, 200) : "";
  const allText = realBizText + " " + fixEncoding(louisMsgs[louisMsgs.length - 1]?.content ?? "");

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
