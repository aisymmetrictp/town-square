"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Download, FileText } from "lucide-react";

interface RiskAccount {
  id: number;
  repName: string;
  customer: string;
  invoiceNo: string;
  amountDue: string | null;
  daysOverdue: number;
  paidStatus: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
}

const fmt = (v: string | null) =>
  v
    ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "$0.00";

export default function WriteOffRiskPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /><p className="text-slate-400">Loading write-off risk data...</p></div></div>}>
      <WriteOffRiskContent />
    </Suspense>
  );
}

function WriteOffRiskContent() {
  const searchParams = useSearchParams();
  const repActive = searchParams.get("repActive") ?? "";
  const viewAs = searchParams.get("viewAs") ?? "";
  const [accounts, setAccounts] = useState<RiskAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (repActive) params.set("repActive", repActive);
    if (viewAs) params.set("viewAs", viewAs);
    const qs = params.toString();
    fetch(`/api/invoices/write-off-risk${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAccounts(data);
      })
      .finally(() => setLoading(false));
  }, [repActive, viewAs]);

  // Group by rep
  const byRep = accounts.reduce(
    (acc, a) => {
      if (!acc[a.repName]) acc[a.repName] = [];
      acc[a.repName].push(a);
      return acc;
    },
    {} as Record<string, RiskAccount[]>
  );

  const repNames = Object.keys(byRep).sort((a, b) => {
    const aDue = byRep[a].reduce((s, x) => s + Number(x.amountDue ?? 0), 0);
    const bDue = byRep[b].reduce((s, x) => s + Number(x.amountDue ?? 0), 0);
    return bDue - aDue;
  });

  const totalRisk = accounts.reduce(
    (s, a) => s + Number(a.amountDue ?? 0),
    0
  );

  async function exportPDF() {
    setExporting(true);
    try {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      await import("jspdf-autotable");

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("Write-Off Risk Report", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated ${new Date().toLocaleDateString()} — ${accounts.length} accounts — Total at risk: $${totalRisk.toLocaleString()}`,
        14,
        30
      );

      let y = 38;

      for (const repName of repNames) {
        const repAccounts = byRep[repName];
        const repTotal = repAccounts.reduce(
          (s, a) => s + Number(a.amountDue ?? 0),
          0
        );

        // Rep header
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(
          `${repName} — $${repTotal.toLocaleString()} (${repAccounts.length} accounts)`,
          14,
          y
        );
        y += 4;

        // Table
        (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
          startY: y,
          head: [["Customer", "Invoice #", "Amount Due", "Days Overdue", "Status"]],
          body: repAccounts.map((a) => [
            a.customer,
            a.invoiceNo,
            fmt(a.amountDue),
            `${a.daysOverdue}d`,
            a.paidStatus ?? "",
          ]),
          theme: "grid",
          headStyles: {
            fillColor: [15, 23, 42],
            fontSize: 8,
            cellPadding: 3,
          },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            2: { halign: "right" },
            3: { halign: "right" },
          },
          margin: { left: 14, right: 14 },
        });

        y =
          (doc as unknown as { lastAutoTable: { finalY: number } })
            .lastAutoTable.finalY + 10;
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Town Square Publications — Write-Off Risk Report — Page ${i} of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      doc.save(
        `write-off-risk-${new Date().toISOString().split("T")[0]}.pdf`
      );
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading write-off risk data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Write-Off Risk Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounts 365+ days overdue with no payment — grouped by rep
          </p>
        </div>
        <button
          onClick={exportPDF}
          disabled={exporting || accounts.length === 0}
          className="flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <Download size={16} />
          {exporting ? "Generating..." : "Export PDF"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="premium-card p-5 border-l-4 border-l-rose-500">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Total at Risk
          </p>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            ${totalRisk.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="premium-card p-5 border-l-4 border-l-amber-500">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Accounts
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {accounts.length}
          </p>
        </div>
        <div className="premium-card p-5 border-l-4 border-l-slate-400">
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            Reps Affected
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {repNames.length}
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <FileText size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">
            No accounts currently qualify for write-off risk
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Accounts must be 365+ days overdue with no full payment
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {repNames.map((repName) => {
            const repAccounts = byRep[repName];
            const repTotal = repAccounts.reduce(
              (s, a) => s + Number(a.amountDue ?? 0),
              0
            );
            return (
              <div key={repName} className="premium-card overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-rose-500" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {repName}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {repAccounts.length} accounts ·{" "}
                        ${repTotal.toLocaleString()} at risk
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="text-left py-2.5 px-4 font-medium">
                          Customer
                        </th>
                        <th className="text-left py-2.5 px-3 font-medium">
                          Invoice #
                        </th>
                        <th className="text-right py-2.5 px-3 font-medium">
                          Amount Due
                        </th>
                        <th className="text-right py-2.5 px-3 font-medium">
                          Days Overdue
                        </th>
                        <th className="text-left py-2.5 px-3 font-medium">
                          Status
                        </th>
                        <th className="text-left py-2.5 px-4 font-medium hidden md:table-cell">
                          Contact
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {repAccounts.map((a, i) => (
                        <tr
                          key={a.id}
                          className={`border-b border-slate-50 ${
                            i % 2 === 1 ? "bg-slate-50/30" : ""
                          }`}
                        >
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {a.customer}
                          </td>
                          <td className="py-2.5 px-3 tabular-nums text-slate-600">
                            {a.invoiceNo}
                          </td>
                          <td className="text-right py-2.5 px-3 tabular-nums font-semibold text-rose-600">
                            {fmt(a.amountDue)}
                          </td>
                          <td className="text-right py-2.5 px-3 tabular-nums text-rose-600 font-medium">
                            {a.daysOverdue}d
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-500">
                            {a.paidStatus}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-slate-400 hidden md:table-cell">
                            {a.contact}
                            {a.phone && (
                              <span className="ml-2">{a.phone}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
