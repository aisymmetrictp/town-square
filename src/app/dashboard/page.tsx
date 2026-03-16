"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KPICards } from "@/components/KPICards";
import { AgingChart, type AgingBucket } from "@/components/AgingChart";
import { TrendingUp, ArrowRight, UserX } from "lucide-react";

interface Summary {
  totalDue: number;
  totalGross: number;
  totalPaid: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  notPaidCount: number;
}

interface RepSummary {
  repName: string;
  repCode: string;
  totalDue: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  unpaidCount: number;
}

interface UserInfo {
  role: string;
}

export default function DashboardPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      }
    >
      <DashboardPage />
    </Suspense>
  );
}

function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewAs = searchParams.get("viewAs") ?? "";
  const repActive = searchParams.get("repActive") ?? "";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [repData, setRepData] = useState<RepSummary[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [unassigned, setUnassigned] = useState<{ count: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  const isManagerOrAdmin = userRole === "manager" || userRole === "admin";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (viewAs) params.set("viewAs", viewAs);
    if (repActive) params.set("repActive", repActive);
    const qs = params.toString() ? `?${params.toString()}` : "";
    Promise.all([
      fetch(`/api/invoices/summary${qs}`).then((r) => {
        if (r.status === 401 || r.redirected) throw new Error("unauthorized");
        if (!r.ok) throw new Error("api-error");
        return r.json();
      }),
      fetch(`/api/invoices/aging${qs}`).then((r) => {
        if (r.status === 401 || r.redirected) throw new Error("unauthorized");
        if (!r.ok) throw new Error("api-error");
        return r.json();
      }),
      fetch(`/api/invoices/rep-summary${qs}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
      fetch("/api/me")
        .then((r) => r.json())
        .catch(() => ({})),
    ])
      .then(([summaryData, agingData, repSummaryData, meData]) => {
        setSummary(summaryData);
        setAging(agingData);
        setRepData(Array.isArray(repSummaryData) ? repSummaryData : []);
        setUserRole(meData?.role ?? "");
        setNeedsSetup(false);
      })
      .catch((err) => {
        if (err.message === "unauthorized") {
          setNeedsSetup(true);
        } else {
          setSummary(null);
          setNeedsSetup(false);
        }
      })
      .finally(() => setLoading(false));

    // Fetch unassigned totals separately (always global, for managers/admins)
    fetch("/api/invoices/summary?repActive=inactive")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) =>
        data
          ? setUnassigned({ count: data.invoiceCount, total: data.totalDue })
          : setUnassigned(null)
      )
      .catch(() => setUnassigned(null));
  }, [viewAs, repActive]);

  function handleBucketClick(bucket: string) {
    const params = new URLSearchParams();
    params.set("bucket", bucket);
    if (viewAs) params.set("viewAs", viewAs);
    if (repActive) params.set("repActive", repActive);
    router.push(`/dashboard/invoices?${params.toString()}`);
  }

  async function handleSetup() {
    setSettingUp(true);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        alert(data.error || "Setup failed");
      }
    } finally {
      setSettingUp(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-600">
          Your account is not linked to a rep yet.
        </p>
        <button
          onClick={handleSetup}
          disabled={settingUp}
          className="bg-slate-900 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {settingUp ? "Setting up..." : "Set up as Manager"}
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Failed to load data.</p>
      </div>
    );
  }

  const maxRepDue = repData.length > 0 ? Math.max(...repData.map((r) => r.totalDue)) : 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {viewAs ? `${viewAs} — Overview` : "Overview"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounts Receivable Aging Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <TrendingUp size={14} />
          <span>Real-time</span>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards data={summary} />

      {/* Unassigned invoices alert */}
      {isManagerOrAdmin && unassigned && unassigned.count > 0 && (
        <Link
          href="/dashboard/unassigned"
          className="premium-card p-4 mt-6 border-l-4 border-l-amber-500 flex items-center justify-between hover:bg-amber-50/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <UserX size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {unassigned.count.toLocaleString()} unassigned invoice
                {unassigned.count !== 1 ? "s" : ""} &middot; $
                {unassigned.total.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                Invoices under inactive reps need reassignment
              </p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-400" />
        </Link>
      )}

      {/* Chart + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Aging Chart - 2/3 width */}
        <div className="lg:col-span-2 premium-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Aging Breakdown
            </h2>
            <span className="text-xs text-slate-400">
              Click a bar to drill in
            </span>
          </div>
          <AgingChart data={aging} onBucketClick={handleBucketClick} />
        </div>

        {/* Quick Stats Panel - 1/3 width */}
        <div className="premium-card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Quick Stats
          </h2>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Collection Rate
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {summary.totalGross > 0
                  ? ((summary.totalPaid / summary.totalGross) * 100).toFixed(1)
                  : "0.0"}
                %
              </p>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      summary.totalGross > 0
                        ? (summary.totalPaid / summary.totalGross) * 100
                        : 0,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Total Gross
              </p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ${Number(summary.totalGross).toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Total Paid
              </p>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                ${Number(summary.totalPaid).toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Outstanding
              </p>
              <p className="text-xl font-bold text-rose-600 mt-1">
                ${Number(summary.totalDue).toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rep Performance Table */}
      {isManagerOrAdmin && repData.length > 0 && !viewAs && (
        <div className="premium-card mt-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">
              Rep Performance
            </h2>
            <span className="text-xs text-slate-400">
              {repData.length} reps
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="text-left py-3 px-6 font-medium">Rep</th>
                  <th className="text-right py-3 px-4 font-medium">
                    Total Due
                  </th>
                  <th className="text-right py-3 px-4 font-medium hidden sm:table-cell">
                    Invoices
                  </th>
                  <th className="text-right py-3 px-4 font-medium hidden md:table-cell">
                    Avg Days
                  </th>
                  <th className="text-right py-3 px-4 font-medium hidden md:table-cell">
                    Unpaid
                  </th>
                  <th className="py-3 px-6 font-medium w-48 hidden lg:table-cell">
                    Share
                  </th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {repData.map((rep, i) => (
                  <tr
                    key={rep.repName}
                    className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors ${
                      i % 2 === 0 ? "" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="py-3 px-6">
                      <Link
                        href={`/dashboard/rep/${encodeURIComponent(
                          rep.repName
                        )}`}
                        className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {rep.repName}
                      </Link>
                      <p className="text-xs text-slate-400">{rep.repCode}</p>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold tabular-nums text-slate-900">
                      $
                      {rep.totalDue.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td className="text-right py-3 px-4 tabular-nums text-slate-600 hidden sm:table-cell">
                      {rep.invoiceCount.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 tabular-nums hidden md:table-cell">
                      <span
                        className={
                          rep.avgDaysOverdue > 90
                            ? "text-rose-600 font-medium"
                            : rep.avgDaysOverdue > 30
                            ? "text-amber-600"
                            : "text-slate-600"
                        }
                      >
                        {rep.avgDaysOverdue}d
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 tabular-nums text-slate-600 hidden md:table-cell">
                      {rep.unpaidCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-6 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${(rep.totalDue / maxRepDue) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-10 text-right tabular-nums">
                          {((rep.totalDue / maxRepDue) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/rep/${encodeURIComponent(
                          rep.repName
                        )}`}
                        className="text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
