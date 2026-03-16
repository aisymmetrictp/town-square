"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { bucketFromDays, BUCKETS } from "@/lib/aging-buckets";
import {
  X,
  Phone,
  Mail,
  User,
  ExternalLink,
  MessageSquare,
  Send,
  CheckCircle2,
} from "lucide-react";

interface Invoice {
  id: number;
  repCode: string;
  repName: string;
  customer: string;
  invoiceNo: string;
  daysOverdue: number;
  grossPrice: string | null;
  paidAmount: string | null;
  amountDue: string | null;
  paidStatus: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
}

const BUCKET_COLORS: Record<string, string> = {
  Current: "bg-emerald-100 text-emerald-700",
  "1-30d": "bg-emerald-50 text-emerald-600",
  "31-60d": "bg-amber-100 text-amber-700",
  "61-90d": "bg-orange-100 text-orange-700",
  "91-180d": "bg-rose-100 text-rose-700",
  "181-365d": "bg-red-100 text-red-700",
  "365+d": "bg-red-200 text-red-800",
};

const STATUS_DOT: Record<string, string> = {
  Completely: "bg-emerald-500",
  Partially: "bg-amber-500",
  "Not at all": "bg-rose-500",
};

const STATUS_OPTIONS = ["", "Not at all", "Partially", "Completely"];

const fmt = (v: string | null) =>
  v
    ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "$0.00";

export default function InvoicesPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Loading invoices...</p>
          </div>
        </div>
      }
    >
      <InvoicesPage />
    </Suspense>
  );
}

function InvoicesPage() {
  const searchParams = useSearchParams();
  const viewAs = searchParams.get("viewAs") ?? "";
  const repActive = searchParams.get("repActive") ?? "";
  const urlBucket = searchParams.get("bucket") ?? "";
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState(urlBucket);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [contactNote, setContactNote] = useState("");
  const [loggingContact, setLoggingContact] = useState(false);
  const [contactLogged, setContactLogged] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (bucket) params.set("bucket", bucket);
    if (status) params.set("status", status);
    if (viewAs) params.set("viewAs", viewAs);
    if (repActive) params.set("repActive", repActive);
    fetch(`/api/invoices?${params}`)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [bucket, status, viewAs, repActive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function buildMailtoLink(inv: Invoice) {
    const subject = encodeURIComponent(
      `Invoice #${inv.invoiceNo} — Payment Follow-up`
    );
    const body = encodeURIComponent(
      `Dear ${inv.contact || "Customer"},\n\n` +
        `I'm writing to follow up on Invoice #${inv.invoiceNo} with an outstanding balance of ${fmt(inv.amountDue)}.\n\n` +
        `This invoice is currently ${inv.daysOverdue} days overdue. We would appreciate your prompt attention to this matter.\n\n` +
        `Please let me know if you have any questions.\n\nBest regards`
    );
    return `mailto:${inv.email}?subject=${subject}&body=${body}`;
  }

  async function logContact() {
    if (!selected) return;
    setLoggingContact(true);
    try {
      await fetch("/api/contacts-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: selected.id, note: contactNote }),
      });
      setContactLogged(true);
      setContactNote("");
    } finally {
      setLoggingContact(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? "Loading..."
              : `Showing ${rows.length} invoice${rows.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="premium-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Filters
          </span>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">All buckets</option>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || "All statuses"}
              </option>
            ))}
          </select>

          {(bucket || status) && (
            <button
              onClick={() => {
                setBucket("");
                setStatus("");
              }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Rollup summary when filters active */}
        {(bucket || status) && !loading && rows.length > 0 && (() => {
          const totalGross = rows.reduce((s, r) => s + Number(r.grossPrice ?? 0), 0);
          const totalPaid = rows.reduce((s, r) => s + Number(r.paidAmount ?? 0), 0);
          const totalDue = rows.reduce((s, r) => s + Number(r.amountDue ?? 0), 0);
          const fmtNum = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
          return (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Invoices</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{rows.length.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Gross</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{fmtNum(totalGross)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-emerald-500 uppercase tracking-wider font-medium">Paid</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmtNum(totalPaid)}</p>
              </div>
              <div className="bg-rose-50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-rose-400 uppercase tracking-wider font-medium">Amount Due</p>
                <p className="text-lg font-bold text-rose-700 tabular-nums">{fmtNum(totalDue)}</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Loading invoices...</p>
          </div>
        </div>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-3 font-medium">
                    Invoice #
                  </th>
                  <th className="text-right py-3 px-3 font-medium">
                    Days Overdue
                  </th>
                  <th className="text-right py-3 px-3 font-medium hidden md:table-cell">
                    Gross
                  </th>
                  <th className="text-right py-3 px-3 font-medium hidden md:table-cell">
                    Paid
                  </th>
                  <th className="text-right py-3 px-3 font-medium">
                    Amount Due
                  </th>
                  <th className="text-left py-3 px-3 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv, i) => {
                  const agingBucket = bucketFromDays(inv.daysOverdue ?? 0);
                  const isSevere = inv.daysOverdue > 90;
                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-slate-50 cursor-pointer hover:bg-blue-50/40 transition-colors ${
                        i % 2 === 1 ? "bg-slate-50/50" : ""
                      }`}
                      onClick={() => {
                        setSelected(inv);
                        setContactLogged(false);
                        setContactNote("");
                      }}
                    >
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-[200px] truncate">
                        {inv.customer}
                      </td>
                      <td className="py-3 px-3 text-slate-600 tabular-nums">
                        {inv.invoiceNo}
                      </td>
                      <td className="text-right py-3 px-3 tabular-nums">
                        <span
                          className={
                            isSevere
                              ? "text-rose-600 font-semibold"
                              : inv.daysOverdue > 30
                              ? "text-amber-600"
                              : "text-slate-600"
                          }
                        >
                          {inv.daysOverdue}
                        </span>
                      </td>
                      <td className="text-right py-3 px-3 tabular-nums text-slate-500 hidden md:table-cell">
                        {fmt(inv.grossPrice)}
                      </td>
                      <td className="text-right py-3 px-3 tabular-nums text-slate-500 hidden md:table-cell">
                        {fmt(inv.paidAmount)}
                      </td>
                      <td
                        className={`text-right py-3 px-3 tabular-nums font-semibold ${
                          isSevere ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {fmt(inv.amountDue)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              STATUS_DOT[inv.paidStatus ?? ""] ?? "bg-slate-300"
                            }`}
                          />
                          <span className="text-slate-600 text-xs">
                            {inv.paidStatus}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            BUCKET_COLORS[agingBucket] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {agingBucket}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 overflow-y-auto slide-in">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      STATUS_DOT[selected.paidStatus ?? ""] ?? "bg-slate-300"
                    }`}
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    {selected.paidStatus}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {selected.customer}
                </h2>
                <p className="text-sm text-slate-500">
                  Invoice #{selected.invoiceNo}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Amount Due highlight */}
              <div className="premium-card p-5 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                  Amount Due
                </p>
                <p
                  className={`text-3xl font-bold ${
                    (selected.daysOverdue ?? 0) > 90
                      ? "text-rose-600"
                      : "text-slate-900"
                  }`}
                >
                  {fmt(selected.amountDue)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {selected.daysOverdue} days overdue
                </p>
              </div>

              {/* Contact info */}
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User size={14} className="text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-700">
                      {selected.contact || "\u2014"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Phone size={14} className="text-slate-500" />
                    </div>
                    {selected.phone ? (
                      <a
                        href={`tel:${selected.phone}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {selected.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400">\u2014</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Mail size={14} className="text-slate-500" />
                    </div>
                    {selected.email ? (
                      <a
                        href={`mailto:${selected.email}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {selected.email}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400">\u2014</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  {selected.email && (
                    <a
                      href={buildMailtoLink(selected)}
                      className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Send size={14} />
                      Send Follow-up Email
                    </a>
                  )}
                  {!contactLogged ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Contact note..."
                        value={contactNote}
                        onChange={(e) => setContactNote(e.target.value)}
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") logContact();
                        }}
                      />
                      <button
                        onClick={logContact}
                        disabled={loggingContact}
                        className="shrink-0 flex items-center gap-1.5 bg-slate-900 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        <MessageSquare size={14} />
                        {loggingContact ? "..." : "Log"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm py-2">
                      <CheckCircle2 size={16} />
                      Contact logged
                    </div>
                  )}
                </div>
              </div>

              {/* Financial details */}
              <div>
                <h3 className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">
                  Financial Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="premium-card p-3">
                    <p className="text-xs text-slate-400">Gross</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {fmt(selected.grossPrice)}
                    </p>
                  </div>
                  <div className="premium-card p-3">
                    <p className="text-xs text-slate-400">Paid</p>
                    <p className="text-sm font-semibold text-emerald-600 mt-0.5">
                      {fmt(selected.paidAmount)}
                    </p>
                  </div>
                  <div className="premium-card p-3">
                    <p className="text-xs text-slate-400">Rep</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {selected.repName}
                    </p>
                  </div>
                  <div className="premium-card p-3">
                    <p className="text-xs text-slate-400">Bucket</p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {bucketFromDays(selected.daysOverdue ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* View Rep link */}
              <Link
                href={`/dashboard/rep/${encodeURIComponent(selected.repName)}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ExternalLink size={14} />
                View Rep Profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
