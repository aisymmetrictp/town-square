import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq, sum, count, avg } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

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

  // Summary for this rep
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

  // All invoices for this rep
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.repName, decodedRepName))
    .orderBy(invoices.daysOverdue);

  const fmt = (v: string | null) =>
    v
      ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "$0.00";

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
        &larr; Back to Overview
      </Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold">{decodedRepName}</h1>
        <a
          href={`/api/export/${encodeURIComponent(decodedRepName)}`}
          className="bg-black text-white rounded px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
        >
          Download Excel
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Total Due</p>
          <p className="text-2xl font-semibold">{fmt(summary.totalDue)}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Total Gross</p>
          <p className="text-2xl font-semibold">{fmt(summary.totalGross)}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-semibold">{fmt(summary.totalPaid)}</p>
        </div>
        <div className="rounded border p-4">
          <p className="text-sm text-gray-500">Avg Days Overdue</p>
          <p className="text-2xl font-semibold">
            {summary.avgDaysOverdue
              ? Math.round(Number(summary.avgDaysOverdue))
              : 0}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">
        Invoices ({summary.invoiceCount})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Invoice #</th>
              <th className="py-2">Customer</th>
              <th className="py-2 text-right">Gross</th>
              <th className="py-2 text-right">Paid</th>
              <th className="py-2 text-right">Due</th>
              <th className="py-2 text-right">Days Overdue</th>
              <th className="py-2">Status</th>
              <th className="py-2">Contact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id} className="border-b hover:bg-gray-50">
                <td className="py-2">{inv.invoiceNo}</td>
                <td className="py-2">{inv.customer}</td>
                <td className="py-2 text-right">{fmt(inv.grossPrice)}</td>
                <td className="py-2 text-right">{fmt(inv.paidAmount)}</td>
                <td className="py-2 text-right">{fmt(inv.amountDue)}</td>
                <td className="py-2 text-right">{inv.daysOverdue}</td>
                <td className="py-2">{inv.paidStatus}</td>
                <td className="py-2 text-xs">
                  {inv.contact}
                  {inv.phone && <span className="ml-2">{inv.phone}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
