"use client";

import { useEffect, useState } from "react";
import { KPICards } from "@/components/KPICards";
import { AgingChart, type AgingBucket } from "@/components/AgingChart";

interface Summary {
  totalDue: number;
  totalGross: number;
  totalPaid: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  notPaidCount: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/invoices/summary").then((r) => r.json()),
      fetch("/api/invoices/aging").then((r) => r.json()),
    ])
      .then(([summaryData, agingData]) => {
        setSummary(summaryData);
        setAging(agingData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">
          Failed to load data. Make sure your account is linked to a rep.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>

      <KPICards data={summary} />

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Aging Breakdown</h2>
        <div className="rounded-lg border p-4 bg-white">
          <AgingChart data={aging} />
        </div>
      </div>
    </div>
  );
}
