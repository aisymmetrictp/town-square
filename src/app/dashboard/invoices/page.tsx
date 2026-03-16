"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Select,
  SelectItem,
} from "@tremor/react";
import { bucketFromDays, BUCKETS } from "@/components/AgingChart";

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
  Current: "green",
  "1-30d": "emerald",
  "31-60d": "yellow",
  "61-90d": "orange",
  "91-180d": "rose",
  "181-365d": "red",
  "365+d": "red",
};

const STATUS_OPTIONS = ["", "Not at all", "Partially", "Completely"];

const fmt = (v: string | null) =>
  v
    ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "$0.00";

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (bucket) params.set("bucket", bucket);
    if (status) params.set("status", status);
    fetch(`/api/invoices?${params}`)
      .then((r) => r.json())
      .then((data) => setRows(data))
      .finally(() => setLoading(false));
  }, [bucket, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Invoices</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select
          value={bucket}
          onValueChange={setBucket}
          placeholder="All buckets"
          className="max-w-xs"
        >
          <SelectItem value="">All buckets</SelectItem>
          {BUCKETS.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </Select>

        <Select
          value={status}
          onValueChange={setStatus}
          placeholder="All statuses"
          className="max-w-xs"
        >
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s || "All statuses"}
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500 py-8 text-center">Loading invoices...</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Invoice #</TableHeaderCell>
              <TableHeaderCell className="text-right">
                Days Overdue
              </TableHeaderCell>
              <TableHeaderCell className="text-right">Gross</TableHeaderCell>
              <TableHeaderCell className="text-right">Paid</TableHeaderCell>
              <TableHeaderCell className="text-right">
                Amount Due
              </TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Bucket</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((inv) => {
              const agingBucket = bucketFromDays(inv.daysOverdue ?? 0);
              return (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelected(inv)}
                >
                  <TableCell>{inv.customer}</TableCell>
                  <TableCell>{inv.invoiceNo}</TableCell>
                  <TableCell className="text-right">
                    {inv.daysOverdue}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmt(inv.grossPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmt(inv.paidAmount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fmt(inv.amountDue)}
                  </TableCell>
                  <TableCell>{inv.paidStatus}</TableCell>
                  <TableCell>
                    <Badge color={BUCKET_COLORS[agingBucket] as any}>
                      {agingBucket}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Slide-over panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSelected(null)}
          />
          <div className="relative w-full max-w-md bg-white shadow-xl border-l p-6 overflow-y-auto">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
            >
              &times;
            </button>

            <h2 className="text-lg font-bold mb-1">{selected.customer}</h2>
            <p className="text-sm text-gray-500 mb-6">
              Invoice #{selected.invoiceNo}
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Contact
                </p>
                <p className="text-sm font-medium">
                  {selected.contact || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-sm">
                  {selected.phone ? (
                    <a
                      href={`tel:${selected.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selected.phone}
                    </a>
                  ) : (
                    "\u2014"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">
                  Email
                </p>
                <p className="text-sm">
                  {selected.email ? (
                    <a
                      href={`mailto:${selected.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selected.email}
                    </a>
                  ) : (
                    "\u2014"
                  )}
                </p>
              </div>

              <hr />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Rep
                  </p>
                  <p className="text-sm">{selected.repName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Days Overdue
                  </p>
                  <p className="text-sm font-medium">{selected.daysOverdue}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Gross
                  </p>
                  <p className="text-sm">{fmt(selected.grossPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Paid
                  </p>
                  <p className="text-sm">{fmt(selected.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Amount Due
                  </p>
                  <p className="text-sm font-bold">
                    {fmt(selected.amountDue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                    Status
                  </p>
                  <p className="text-sm">{selected.paidStatus}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
