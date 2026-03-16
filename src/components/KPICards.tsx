"use client";

import { DollarSign, FileStack, Clock, AlertTriangle } from "lucide-react";

interface KPIData {
  totalDue: number;
  totalGross: number;
  totalPaid: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  notPaidCount: number;
}

export function KPICards({ data }: { data: KPIData }) {
  const collectionRate = data.totalGross > 0
    ? (data.totalPaid / data.totalGross) * 100
    : 0;

  const collectionRateDisplay = collectionRate.toFixed(1);

  const unpaidPct = data.invoiceCount > 0
    ? (data.notPaidCount / data.invoiceCount) * 100
    : 0;

  const unpaidPctDisplay = unpaidPct.toFixed(1);

  const collectionDotColor =
    collectionRate > 80
      ? "bg-emerald-500"
      : collectionRate >= 50
        ? "bg-amber-500"
        : "bg-rose-500";

  const overdueColor =
    data.avgDaysOverdue < 30
      ? "text-emerald-600"
      : data.avgDaysOverdue <= 90
        ? "text-amber-600"
        : "text-rose-600";

  const overdueSeverity =
    data.avgDaysOverdue < 30
      ? "On track"
      : data.avgDaysOverdue <= 90
        ? "Needs attention"
        : "Critical";

  const unpaidBadgeColor =
    unpaidPct > 50
      ? "text-rose-600"
      : unpaidPct > 25
        ? "text-amber-600"
        : "text-slate-500";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Amount Due */}
      <div className="premium-card p-5 border-l-4 border-l-blue-500 transition-shadow duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-50">
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm text-slate-500 font-medium">Total Amount Due</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-1">
          ${Number(data.totalDue).toLocaleString()}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`inline-block w-2 h-2 rounded-full ${collectionDotColor}`} />
          <span className="text-xs text-slate-500">{collectionRateDisplay}% collected</span>
        </div>
      </div>

      {/* Invoice Count */}
      <div className="premium-card p-5 border-l-4 border-l-slate-400 transition-shadow duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-100">
            <FileStack className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-sm text-slate-500 font-medium">Invoice Count</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-1">
          {data.invoiceCount.toLocaleString()}
        </div>
        <div className="mt-1">
          <span className="text-xs text-slate-400">total invoices</span>
        </div>
      </div>

      {/* Avg Days Overdue */}
      <div className="premium-card p-5 border-l-4 border-l-amber-500 transition-shadow duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-50">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-sm text-slate-500 font-medium">Avg Days Overdue</span>
        </div>
        <div className={`text-2xl font-bold mt-1 ${overdueColor}`}>
          {Math.round(data.avgDaysOverdue)}
        </div>
        <div className="mt-1">
          <span className={`text-xs ${overdueColor}`}>{overdueSeverity}</span>
        </div>
      </div>

      {/* Unpaid Invoices */}
      <div className="premium-card p-5 border-l-4 border-l-rose-500 transition-shadow duration-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-50">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-sm text-slate-500 font-medium">Unpaid Invoices</span>
        </div>
        <div className="text-2xl font-bold text-slate-900 mt-1">
          {Number(data.notPaidCount).toLocaleString()}
        </div>
        <div className="mt-1">
          <span className={`text-xs ${unpaidBadgeColor}`}>{unpaidPctDisplay}% unpaid</span>
        </div>
      </div>
    </div>
  );
}
