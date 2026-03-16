"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface PriorityItem {
  id: number;
  customer: string;
  invoiceNo: string;
  amountDue: string | null;
  daysOverdue: number;
  paidStatus: string | null;
  riskScore: number;
  contact: string | null;
  phone: string | null;
  email: string | null;
  lastContacted: string | null;
}

interface Props {
  priorityQueue: PriorityItem[];
  repName: string;
}

const fmt = (v: string | null) =>
  v
    ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "$0.00";

function riskColor(score: number) {
  if (score >= 70) return "text-rose-600 bg-rose-50";
  if (score >= 40) return "text-amber-600 bg-amber-50";
  return "text-slate-600 bg-slate-50";
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function RepClientSection({ priorityQueue, repName }: Props) {
  const [contactNote, setContactNote] = useState("");
  const [contactingId, setContactingId] = useState<number | null>(null);
  const [loggedIds, setLoggedIds] = useState<Set<number>>(new Set());
  const [showNoteFor, setShowNoteFor] = useState<number | null>(null);

  async function logContact(invoiceId: number) {
    setContactingId(invoiceId);
    try {
      await fetch("/api/contacts-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, note: contactNote }),
      });
      setLoggedIds((prev) => new Set(prev).add(invoiceId));
      setContactNote("");
      setShowNoteFor(null);
    } finally {
      setContactingId(null);
    }
  }

  function buildMailtoLink(item: PriorityItem) {
    const subject = encodeURIComponent(
      `Invoice #${item.invoiceNo} — Payment Follow-up`
    );
    const body = encodeURIComponent(
      `Dear ${item.contact || "Customer"},\n\n` +
        `I'm writing to follow up on Invoice #${item.invoiceNo} with an outstanding balance of ${fmt(item.amountDue)}.\n\n` +
        `This invoice is currently ${item.daysOverdue} days overdue. We would appreciate your prompt attention to this matter.\n\n` +
        `Please let me know if you have any questions or if there's anything I can help with.\n\n` +
        `Best regards`
    );
    return `mailto:${item.email}?subject=${subject}&body=${body}`;
  }

  if (priorityQueue.length === 0) return null;

  return (
    <div className="premium-card overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h2 className="text-base font-semibold text-slate-900">
            Priority Queue — Call Today
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          Top {priorityQueue.length} by risk score
        </span>
      </div>

      <div className="divide-y divide-slate-50">
        {priorityQueue.map((item, i) => {
          const contacted = loggedIds.has(item.id);
          const dsc = daysSince(item.lastContacted);
          return (
            <div
              key={item.id}
              className={`px-6 py-4 hover:bg-blue-50/30 transition-colors ${
                i % 2 === 1 ? "bg-slate-50/30" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 truncate">
                      {item.customer}
                    </span>
                    <span className="text-xs text-slate-400">
                      #{item.invoiceNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-sm font-semibold text-slate-900">
                      {fmt(item.amountDue)}
                    </span>
                    <span
                      className={`text-xs ${
                        item.daysOverdue > 90
                          ? "text-rose-500"
                          : item.daysOverdue > 30
                            ? "text-amber-500"
                            : "text-slate-400"
                      }`}
                    >
                      {item.daysOverdue}d overdue
                    </span>
                    {dsc !== null && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={10} />
                        Contacted {dsc}d ago
                      </span>
                    )}
                  </div>
                </div>

                {/* Risk Score */}
                <div
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums ${riskColor(item.riskScore)}`}
                >
                  {item.riskScore}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.email && (
                    <a
                      href={buildMailtoLink(item)}
                      className="p-2 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"
                      title="Send follow-up email"
                    >
                      <Mail size={16} />
                    </a>
                  )}
                  {item.phone && (
                    <a
                      href={`tel:${item.phone}`}
                      className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-500 transition-colors"
                      title={`Call ${item.phone}`}
                    >
                      <Phone size={16} />
                    </a>
                  )}
                  {contacted ? (
                    <div className="p-2 text-emerald-500">
                      <CheckCircle2 size={16} />
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setShowNoteFor(
                          showNoteFor === item.id ? null : item.id
                        )
                      }
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Log contact attempt"
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact note input */}
              {showNoteFor === item.id && !contacted && (
                <div className="mt-3 ml-11 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add a note (optional)..."
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") logContact(item.id);
                    }}
                  />
                  <button
                    onClick={() => logContact(item.id)}
                    disabled={contactingId === item.id}
                    className="bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {contactingId === item.id ? "Logging..." : "Log Contact"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
