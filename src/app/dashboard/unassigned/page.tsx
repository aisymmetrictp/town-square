"use client";

import { useEffect, useState } from "react";
import {
  UserX,
  DollarSign,
  FileText,
  Users,
  ArrowRight,
  Check,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

interface Invoice {
  id: number;
  repName: string;
  repCode: string;
  customer: string;
  invoiceNo: string;
  amountDue: string | null;
  daysOverdue: number;
  grossPrice: string | null;
  paidAmount: string | null;
  paidStatus: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
}

interface Rep {
  repName: string;
  repCode: string;
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function UnassignedPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeReps, setActiveReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [targetRep, setTargetRep] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [filterRep, setFilterRep] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/invoices/unassigned").then((r) => r.json()),
      fetch("/api/reps").then((r) => r.json()),
      fetch("/api/rep-status").then((r) => r.json()),
    ])
      .then(([inv, reps, statuses]) => {
        if (Array.isArray(inv)) setInvoices(inv);
        // Filter to only active reps
        const inactiveNames = new Set(
          (Array.isArray(statuses) ? statuses : [])
            .filter((s: { isActive: boolean }) => !s.isActive)
            .map((s: { repName: string }) => s.repName.toLowerCase())
        );
        if (Array.isArray(reps)) {
          setActiveReps(
            reps.filter(
              (r: Rep) => !inactiveNames.has(r.repName.toLowerCase())
            )
          );
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group by rep
  const byRep: Record<string, Invoice[]> = {};
  for (const inv of invoices) {
    if (!byRep[inv.repName]) byRep[inv.repName] = [];
    byRep[inv.repName].push(inv);
  }
  const allRepNames = Object.keys(byRep).sort();

  // Apply filter
  const repNames = filterRep
    ? allRepNames.filter((name) => name === filterRep)
    : allRepNames;

  const filteredInvoices = filterRep
    ? invoices.filter((inv) => inv.repName === filterRep)
    : invoices;

  const totalAmount = filteredInvoices.reduce(
    (s, inv) => s + Number(inv.amountDue ?? 0),
    0
  );

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRepGroup = (repName: string) => {
    const groupIds = byRep[repName].map((inv) => inv.id);
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = groupIds.every((id) => next.has(id));
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectedAmount = invoices
    .filter((inv) => selected.has(inv.id))
    .reduce((s, inv) => s + Number(inv.amountDue ?? 0), 0);

  const targetRepObj = activeReps.find((r) => r.repName === targetRep);

  const handleReassign = async () => {
    if (!targetRepObj || selected.size === 0) return;
    setReassigning(true);
    try {
      const res = await fetch("/api/invoices/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceIds: Array.from(selected),
          newRepName: targetRepObj.repName,
          newRepCode: targetRepObj.repCode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(
          `Reassigned ${data.updated} invoices to ${targetRepObj.repName}`
        );
        setSelected(new Set());
        setTargetRep("");
        setShowConfirm(false);
        fetchData();
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } finally {
      setReassigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">Loading unassigned invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Unassigned Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Invoices under inactive reps that need reassignment
          </p>
        </div>

        {/* Rep filter dropdown */}
        {allRepNames.length > 1 && (
          <div className="relative">
            <select
              value={filterRep}
              onChange={(e) => {
                setFilterRep(e.target.value);
                setSelected(new Set());
              }}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-9 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[220px]"
            >
              <option value="">All Inactive Reps ({allRepNames.length})</option>
              {allRepNames.map((name) => (
                <option key={name} value={name}>
                  {name} ({byRep[name].length})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <Check size={18} className="text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="premium-card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                {filterRep ? "Invoices" : "Unassigned Invoices"}
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {filteredInvoices.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="premium-card p-5 border-l-4 border-l-rose-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <DollarSign size={18} className="text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Total Amount Due
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {fmt(totalAmount)}
              </p>
            </div>
          </div>
        </div>
        <div className="premium-card p-5 border-l-4 border-l-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Users size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                {filterRep ? "Viewing Rep" : "Inactive Reps"}
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {filterRep ? "1" : repNames.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="premium-card p-12 text-center">
          <Check size={48} className="mx-auto text-emerald-400 mb-4" />
          <p className="text-lg font-semibold text-slate-700">
            {filterRep ? `No invoices for ${filterRep}` : "All invoices are assigned"}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {filterRep ? "This rep has no unassigned invoices" : "No invoices under inactive reps"}
          </p>
        </div>
      ) : (
        <>
          {/* Grouped invoice tables */}
          {repNames.map((repName) => {
            const group = byRep[repName];
            const groupTotal = group.reduce(
              (s, inv) => s + Number(inv.amountDue ?? 0),
              0
            );
            const allSelected = group.every((inv) => selected.has(inv.id));
            const someSelected = group.some((inv) => selected.has(inv.id));

            return (
              <div key={repName} className="premium-card overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => toggleRepGroup(repName)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <UserX size={16} className="text-slate-400" />
                        <span className="font-semibold text-slate-900">
                          {repName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                          Inactive
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.length} invoices · {fmt(groupTotal)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="w-10 py-2 px-4"></th>
                        <th className="text-left py-2 px-4 font-medium">
                          Customer
                        </th>
                        <th className="text-left py-2 px-4 font-medium">
                          Invoice #
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Days Overdue
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Gross
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Paid
                        </th>
                        <th className="text-right py-2 px-4 font-medium">
                          Amount Due
                        </th>
                        <th className="text-left py-2 px-4 font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((inv, i) => (
                        <tr
                          key={inv.id}
                          className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors ${
                            i % 2 === 1 ? "bg-slate-50/50" : ""
                          } ${selected.has(inv.id) ? "bg-blue-50/60" : ""}`}
                        >
                          <td className="py-2.5 px-4">
                            <input
                              type="checkbox"
                              checked={selected.has(inv.id)}
                              onChange={() => toggleSelect(inv.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">
                            {inv.customer}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            {inv.invoiceNo}
                          </td>
                          <td className="text-right py-2.5 px-4 tabular-nums">
                            <span
                              className={
                                inv.daysOverdue > 90
                                  ? "text-rose-600 font-medium"
                                  : inv.daysOverdue > 30
                                    ? "text-amber-600"
                                    : "text-slate-600"
                              }
                            >
                              {inv.daysOverdue}d
                            </span>
                          </td>
                          <td className="text-right py-2.5 px-4 tabular-nums text-slate-600">
                            {fmt(Number(inv.grossPrice ?? 0))}
                          </td>
                          <td className="text-right py-2.5 px-4 tabular-nums text-slate-600">
                            {fmt(Number(inv.paidAmount ?? 0))}
                          </td>
                          <td className="text-right py-2.5 px-4 tabular-nums font-semibold text-slate-900">
                            {fmt(Number(inv.amountDue ?? 0))}
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                inv.paidStatus === "Completely"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : inv.paidStatus === "Partially"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {inv.paidStatus ?? "Not Paid"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Sticky action bar */}
          {selected.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selected.size} invoice{selected.size > 1 ? "s" : ""}{" "}
                    selected
                  </p>
                  <p className="text-xs text-slate-500">
                    {fmt(selectedAmount)} total
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={targetRep}
                    onChange={(e) => setTargetRep(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[200px]"
                  >
                    <option value="">Assign to rep...</option>
                    {activeReps.map((r) => (
                      <option key={r.repName} value={r.repName}>
                        {r.repName} ({r.repCode})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!targetRep}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <ArrowRight size={16} />
                    Reassign
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation dialog */}
          {showConfirm && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Confirm Reassignment
                  </h3>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  You are about to reassign{" "}
                  <span className="font-semibold">{selected.size}</span>{" "}
                  invoice{selected.size > 1 ? "s" : ""} ({fmt(selectedAmount)})
                  to{" "}
                  <span className="font-semibold">{targetRepObj?.repName}</span>.
                </p>
                <p className="text-xs text-slate-400 mb-6">
                  This will update the rep name and code on all selected
                  invoices. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReassign}
                    disabled={reassigning}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {reassigning ? "Reassigning..." : "Confirm Reassignment"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Spacer for sticky bar */}
          {selected.size > 0 && <div className="h-20" />}
        </>
      )}
    </div>
  );
}
