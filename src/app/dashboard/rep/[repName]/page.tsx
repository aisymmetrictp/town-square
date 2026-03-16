import { db } from "@/db";
import { invoices, contactsLog } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq, sum, count, avg, desc, sql } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { bucketFromDays } from "@/lib/aging-buckets";
import RepClientSection from "./RepClientSection";

interface Props {
  params: Promise<{ repName: string }>;
}

export default async function RepDrillDownPage({ params }: Props) {
  const rep = await getCurrentRep();
  if (!rep) redirect("/sign-in");

  const isManager = rep.role === "manager" || rep.role === "admin";
  if (!isManager) redirect("/dashboard");

  const { repName } = await params;
  const decodedRepName = decodeURIComponent(repName);

  const [summary] = await db
    .select({
      totalDue: sum(invoices.amountDue),
      totalGross: sum(invoices.grossPrice),
      totalPaid: sum(invoices.paidAmount),
      invoiceCount: count(),
      avgDaysOverdue: avg(invoices.daysOverdue),
    })
    .from(invoices)
    .where(eq(invoices.repName, decodedRepName));

  if (!summary || summary.invoiceCount === 0) notFound();

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.repName, decodedRepName))
    .orderBy(desc(invoices.daysOverdue));

  // Priority queue: top 10 unpaid by composite risk score
  const unpaid = rows.filter((r) => r.paidStatus !== "Completely");
  const maxDays = Math.max(...unpaid.map((x) => x.daysOverdue ?? 0), 1);
  const maxAmount = Math.max(...unpaid.map((x) => Number(x.amountDue ?? 0)), 1);

  const priorityQueue = unpaid
    .map((r) => {
      const daysScore = ((r.daysOverdue ?? 0) / maxDays) * 40;
      const amountScore = (Number(r.amountDue ?? 0) / maxAmount) * 35;
      const statusScore =
        r.paidStatus === "Not at all"
          ? 25
          : r.paidStatus === "Partially"
            ? 12.5
            : 0;
      return {
        id: r.id,
        customer: r.customer,
        invoiceNo: r.invoiceNo,
        amountDue: r.amountDue,
        daysOverdue: r.daysOverdue ?? 0,
        paidStatus: r.paidStatus,
        riskScore:
          Math.round((daysScore + amountScore + statusScore) * 10) / 10,
        contact: r.contact,
        phone: r.phone,
        email: r.email,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);

  // Get last contacted dates
  const contactedMap = new Map<number, string>();
  if (rows.length > 0) {
    try {
      const contactRows = await db
        .select({
          invoiceId: contactsLog.invoiceId,
          lastContacted:
            sql<string>`MAX(${contactsLog.contactedAt})`.as("last_contacted"),
        })
        .from(contactsLog)
        .where(
          sql`${contactsLog.invoiceId} IN (${sql.join(
            rows.map((r) => sql`${r.id}`),
            sql`, `
          )})`
        )
        .groupBy(contactsLog.invoiceId);

      for (const cr of contactRows) {
        contactedMap.set(cr.invoiceId, cr.lastContacted);
      }
    } catch {
      // contacts_log table may not exist yet
    }
  }

  const fmt = (v: string | null) =>
    v
      ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "$0.00";

  const collectionRate =
    Number(summary.totalGross) > 0
      ? (
          (Number(summary.totalPaid) / Number(summary.totalGross)) *
          100
        ).toFixed(1)
      : "0.0";

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

  // Add last contacted to priority queue
  const priorityWithContacts = priorityQueue.map((inv) => ({
    ...inv,
    lastContacted: contactedMap.get(inv.id) || null,
  }));

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
      >
        &larr; Back to Overview
      </Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {decodedRepName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {summary.invoiceCount.toLocaleString()} invoices ·{" "}
            {collectionRate}% collection rate
          </p>
        </div>
        <a
          href={`/api/export/${encodeURIComponent(decodedRepName)}`}
          className="flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Download Excel
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="premium-card p-4 border-l-4 border-l-blue-500">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Total Due
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {fmt(summary.totalDue)}
          </p>
        </div>
        <div className="premium-card p-4 border-l-4 border-l-slate-400">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Total Gross
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {fmt(summary.totalGross)}
          </p>
        </div>
        <div className="premium-card p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Total Paid
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {fmt(summary.totalPaid)}
          </p>
        </div>
        <div className="premium-card p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Avg Days Overdue
          </p>
          <p
            className={`text-xl font-bold mt-1 ${
              Number(summary.avgDaysOverdue ?? 0) > 90
                ? "text-rose-600"
                : Number(summary.avgDaysOverdue ?? 0) > 30
                  ? "text-amber-600"
                  : "text-slate-900"
            }`}
          >
            {summary.avgDaysOverdue
              ? Math.round(Number(summary.avgDaysOverdue))
              : 0}
            d
          </p>
        </div>
      </div>

      {/* Priority Queue + Email Composer (client component) */}
      <RepClientSection
        priorityQueue={priorityWithContacts}
        repName={decodedRepName}
      />

      {/* Full Invoice Table */}
      <div className="premium-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            All Invoices
          </h2>
          <span className="text-xs text-slate-400">
            {summary.invoiceCount.toLocaleString()} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium">Invoice #</th>
                <th className="text-left py-3 px-3 font-medium">Customer</th>
                <th className="text-right py-3 px-3 font-medium hidden md:table-cell">
                  Gross
                </th>
                <th className="text-right py-3 px-3 font-medium hidden md:table-cell">
                  Paid
                </th>
                <th className="text-right py-3 px-3 font-medium">Due</th>
                <th className="text-right py-3 px-3 font-medium">Days</th>
                <th className="text-left py-3 px-3 font-medium">Status</th>
                <th className="text-left py-3 px-3 font-medium">Bucket</th>
                <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">
                  Last Contact
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv, i) => {
                const bucket = bucketFromDays(inv.daysOverdue ?? 0);
                const isSevere = (inv.daysOverdue ?? 0) > 90;
                const lastContact = contactedMap.get(inv.id);
                const daysSinceContact = lastContact
                  ? Math.floor(
                      (Date.now() - new Date(lastContact).getTime()) / 86400000
                    )
                  : null;
                return (
                  <tr
                    key={inv.id}
                    className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors ${
                      i % 2 === 1 ? "bg-slate-50/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 tabular-nums text-slate-600">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900 max-w-[200px] truncate">
                      {inv.customer}
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
                    <td className="text-right py-3 px-3 tabular-nums">
                      <span
                        className={
                          isSevere
                            ? "text-rose-600 font-semibold"
                            : (inv.daysOverdue ?? 0) > 30
                              ? "text-amber-600"
                              : "text-slate-600"
                        }
                      >
                        {inv.daysOverdue}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            STATUS_DOT[inv.paidStatus ?? ""] ?? "bg-slate-300"
                          }`}
                        />
                        <span className="text-xs text-slate-600">
                          {inv.paidStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          BUCKET_COLORS[bucket] ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {bucket}
                      </span>
                    </td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      {daysSinceContact !== null ? (
                        <span
                          className={`text-xs ${
                            daysSinceContact > 14
                              ? "text-rose-500"
                              : daysSinceContact > 7
                                ? "text-amber-500"
                                : "text-emerald-500"
                          }`}
                        >
                          {daysSinceContact}d ago
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">&mdash;</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
