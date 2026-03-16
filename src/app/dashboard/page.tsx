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
  const [needsSetup, setNeedsSetup] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch("/api/invoices/summary").then((r) => {
        if (r.status === 401) throw new Error("unauthorized");
        return r.json();
      }),
      fetch("/api/invoices/aging").then((r) => {
        if (r.status === 401) throw new Error("unauthorized");
        return r.json();
      }),
    ])
      .then(([summaryData, agingData]) => {
        setSummary(summaryData);
        setAging(agingData);
        setNeedsSetup(false);
      })
      .catch(() => {
        setNeedsSetup(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSetup() {
    setSettingUp(true);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        loadData();
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
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-600">
          Your account is not linked to a rep yet.
        </p>
        <button
          onClick={handleSetup}
          disabled={settingUp}
          className="bg-black text-white rounded px-6 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
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
