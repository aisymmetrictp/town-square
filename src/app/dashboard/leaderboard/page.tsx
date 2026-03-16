"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  ArrowRight,
} from "lucide-react";

interface RepRank {
  repName: string;
  repCode: string;
  totalDue: number;
  totalGross: number;
  totalPaid: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  unpaidCount: number;
  collectionRate: number;
}

export default function LeaderboardPage() {
  const [reps, setReps] = useState<RepRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"collectionRate" | "totalDue" | "avgDaysOverdue">(
    "collectionRate"
  );

  useEffect(() => {
    fetch("/api/invoices/rep-summary")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Calculate collection rate for each rep
          const enriched = data.map((r: RepRank & { totalGross?: number; totalPaid?: number }) => ({
            ...r,
            collectionRate:
              r.totalGross && r.totalGross > 0
                ? (r.totalPaid ?? 0) / r.totalGross * 100
                : 0,
          }));
          setReps(enriched);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // We need the rep-summary to include gross/paid. Let's fetch from a richer endpoint.
  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setReps(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...reps].sort((a, b) => {
    if (sortBy === "collectionRate") return b.collectionRate - a.collectionRate;
    if (sortBy === "totalDue") return b.totalDue - a.totalDue;
    return a.avgDaysOverdue - b.avgDaysOverdue;
  });

  const maxDue = Math.max(...reps.map((r) => r.totalDue), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Rep Leaderboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {reps.length} reps ranked by collection performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="collectionRate">Collection Rate</option>
            <option value="totalDue">Total Due</option>
            <option value="avgDaysOverdue">Avg Days Overdue</option>
          </select>
        </div>
      </div>

      {/* Top 3 Podium */}
      {sorted.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map((idx) => {
            const rep = sorted[idx];
            if (!rep) return null;
            const rank = idx + 1;
            const colors = [
              "", // unused
              "border-amber-400 bg-amber-50/30",
              "border-slate-300 bg-slate-50/30",
              "border-orange-300 bg-orange-50/30",
            ];
            const trophyColors = ["", "text-amber-500", "text-slate-400", "text-orange-400"];
            return (
              <div
                key={rep.repName}
                className={`premium-card p-5 border-t-4 ${colors[rank]} ${
                  rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={18} className={trophyColors[rank]} />
                  <span className="text-xs font-bold text-slate-400">
                    #{rank}
                  </span>
                </div>
                <Link
                  href={`/dashboard/rep/${encodeURIComponent(rep.repName)}`}
                  className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors"
                >
                  {rep.repName}
                </Link>
                <p className="text-xs text-slate-400 mt-0.5">{rep.repCode}</p>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs text-slate-400">Collection Rate</p>
                    <p className="text-xl font-bold text-slate-900">
                      {rep.collectionRate.toFixed(1)}%
                    </p>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${Math.min(rep.collectionRate, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Due: ${rep.totalDue.toLocaleString()}</span>
                    <span>Avg: {rep.avgDaysOverdue}d</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Ranking Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-4 font-medium w-12">Rank</th>
                <th className="text-left py-3 px-4 font-medium">Rep</th>
                <th className="text-right py-3 px-4 font-medium">
                  Collection Rate
                </th>
                <th className="text-right py-3 px-4 font-medium">Total Due</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">
                  Invoices
                </th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">
                  Avg Days
                </th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">
                  Unpaid
                </th>
                <th className="py-3 px-4 font-medium w-40 hidden lg:table-cell">
                  AR Share
                </th>
                <th className="py-3 px-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((rep, i) => {
                const rank = i + 1;
                return (
                  <tr
                    key={rep.repName}
                    className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors ${
                      i % 2 === 1 ? "bg-slate-50/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 tabular-nums">
                      <span
                        className={`text-sm font-bold ${
                          rank <= 3
                            ? "text-amber-500"
                            : rank > sorted.length - 3
                              ? "text-rose-400"
                              : "text-slate-400"
                        }`}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/rep/${encodeURIComponent(rep.repName)}`}
                        className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {rep.repName}
                      </Link>
                      <p className="text-xs text-slate-400">{rep.repCode}</p>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          rep.collectionRate >= 80
                            ? "text-emerald-600"
                            : rep.collectionRate >= 50
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        {rep.collectionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 font-semibold tabular-nums text-slate-900">
                      ${rep.totalDue.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 tabular-nums text-slate-600 hidden md:table-cell">
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
                    <td className="text-right py-3 px-4 tabular-nums text-slate-600 hidden lg:table-cell">
                      {rep.unpaidCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${(rep.totalDue / maxDue) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/dashboard/rep/${encodeURIComponent(rep.repName)}`}
                        className="text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        <ArrowRight size={16} />
                      </Link>
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
