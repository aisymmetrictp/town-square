"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Minus,
} from "lucide-react";
import Link from "next/link";

interface Cohort {
  snapshotDate: string;
  totalGross: number;
  totalPaid: number;
  totalDue: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  collectionRate: number;
}

interface BucketRate {
  bucket: string;
  collectionRate: number;
  totalGross: number;
  totalDue: number;
  count: number;
}

interface Forecast {
  currentAR: number;
  projectedCollection30d: number;
  projectedCollection60d: number;
  projectedCollection90d: number;
  projectedAR30d: number;
  projectedAR60d: number;
  projectedAR90d: number;
  weightedCollectionRate: number;
}

interface Scorecard {
  repName: string;
  repCode: string;
  collectionRate: number;
  totalDue: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  meanRate: number;
  stdDev: number;
  zScore: number;
  isBelowBaseline: boolean;
  isAboveBaseline: boolean;
}

interface AnalyticsData {
  cohorts: Cohort[];
  bucketRates: BucketRate[];
  forecast: Forecast;
  scorecards: Scorecard[];
  summary: { meanRate: number; stdDev: number };
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const BUCKET_COLORS: Record<string, string> = {
  Current: "#10b981",
  "1-30d": "#34d399",
  "31-60d": "#fbbf24",
  "61-90d": "#f59e0b",
  "91-180d": "#f97316",
  "181-365d": "#ef4444",
  "365+d": "#dc2626",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-red-500">Failed to load analytics data.</p>
      </div>
    );
  }

  const { cohorts, bucketRates, forecast, scorecards, summary } = data;

  // Forecast chart data
  const forecastChart = [
    { label: "Today", ar: forecast.currentAR },
    { label: "30 Days", ar: forecast.projectedAR30d },
    { label: "60 Days", ar: forecast.projectedAR60d },
    { label: "90 Days", ar: forecast.projectedAR90d },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Collection trends, forecasting, and rep performance analysis
        </p>
      </div>

      {/* Forecast Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 premium-card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            AR Forecast
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Projected outstanding balance based on historical collection rates (
            {forecast.weightedCollectionRate.toFixed(1)}% weighted avg)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={forecastChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => "$" + (v / 1000).toFixed(0) + "K"}
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), "Projected AR"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Line
                type="monotone"
                dataKey="ar"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: "#3b82f6", r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Forecast numbers */}
        <div className="space-y-4">
          <div className="premium-card p-5 border-l-4 border-l-blue-500">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Current AR
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {fmt(forecast.currentAR)}
            </p>
          </div>
          <div className="premium-card p-5 border-l-4 border-l-emerald-500">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Projected at 30d
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {fmt(forecast.projectedAR30d)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmt(forecast.projectedCollection30d)} collected
            </p>
          </div>
          <div className="premium-card p-5 border-l-4 border-l-amber-500">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Projected at 90d
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {fmt(forecast.projectedAR90d)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {fmt(forecast.projectedCollection90d)} collected
            </p>
          </div>
        </div>
      </div>

      {/* Cohort Analysis + Bucket Collection Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cohort Analysis */}
        <div className="premium-card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Cohort Analysis
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Collection rate by snapshot date
          </p>
          {cohorts.length > 0 ? (
            <div className="space-y-3">
              {cohorts.slice(0, 6).map((c) => (
                <div key={c.snapshotDate} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-24 shrink-0 tabular-nums">
                    {c.snapshotDate}
                  </span>
                  <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(c.collectionRate, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-14 text-right tabular-nums">
                    {c.collectionRate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Upload multiple snapshots to see cohort trends
            </p>
          )}
        </div>

        {/* Collection Rate by Aging Bucket */}
        <div className="premium-card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Collection Rate by Bucket
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            How much is collected at each aging stage
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bucketRates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => v.toFixed(0) + "%"}
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value) => [
                  Number(value).toFixed(1) + "%",
                  "Collection Rate",
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Bar dataKey="collectionRate" radius={[4, 4, 0, 0]}>
                {bucketRates.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={BUCKET_COLORS[entry.bucket] ?? "#3B82F6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rep Performance Scorecard */}
      <div className="premium-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            Rep Performance Scorecard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mean collection rate: {summary.meanRate.toFixed(1)}% (±
            {summary.stdDev.toFixed(1)}% std dev) — flagged reps are {">"}1σ
            below mean
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                <th className="text-left py-3 px-6 font-medium">Rep</th>
                <th className="text-right py-3 px-4 font-medium">
                  Collection Rate
                </th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">
                  vs Mean
                </th>
                <th className="text-right py-3 px-4 font-medium">Total Due</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">
                  Avg Days
                </th>
                <th className="text-left py-3 px-4 font-medium w-16">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {scorecards.map((sc, i) => (
                <tr
                  key={sc.repName}
                  className={`border-b border-slate-50 transition-colors ${
                    sc.isBelowBaseline
                      ? "bg-rose-50/30"
                      : i % 2 === 1
                        ? "bg-slate-50/50"
                        : ""
                  }`}
                >
                  <td className="py-3 px-6">
                    <Link
                      href={`/dashboard/rep/${encodeURIComponent(sc.repName)}`}
                      className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {sc.repName}
                    </Link>
                    <p className="text-xs text-slate-400">{sc.repCode}</p>
                  </td>
                  <td className="text-right py-3 px-4">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        sc.collectionRate >= summary.meanRate + summary.stdDev
                          ? "text-emerald-600"
                          : sc.isBelowBaseline
                            ? "text-rose-600"
                            : "text-slate-900"
                      }`}
                    >
                      {sc.collectionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 hidden md:table-cell">
                    <span
                      className={`text-xs font-medium ${
                        sc.zScore > 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {sc.zScore > 0 ? "+" : ""}
                      {(sc.collectionRate - summary.meanRate).toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 font-semibold tabular-nums text-slate-900">
                    {fmt(sc.totalDue)}
                  </td>
                  <td className="text-right py-3 px-4 tabular-nums hidden md:table-cell">
                    <span
                      className={
                        sc.avgDaysOverdue > 90
                          ? "text-rose-600 font-medium"
                          : sc.avgDaysOverdue > 30
                            ? "text-amber-600"
                            : "text-slate-600"
                      }
                    >
                      {sc.avgDaysOverdue}d
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {sc.isAboveBaseline ? (
                      <div className="flex items-center gap-1 text-emerald-500">
                        <TrendingUp size={14} />
                      </div>
                    ) : sc.isBelowBaseline ? (
                      <div className="flex items-center gap-1 text-rose-500">
                        <AlertTriangle size={14} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-300">
                        <Minus size={14} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
