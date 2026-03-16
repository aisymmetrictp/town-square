import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { sum, count, avg, sql, desc } from "drizzle-orm";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      repName: invoices.repName,
      repCode: invoices.repCode,
      totalDue: sum(invoices.amountDue),
      totalGross: sum(invoices.grossPrice),
      totalPaid: sum(invoices.paidAmount),
      invoiceCount: count(),
      avgDaysOverdue: avg(invoices.daysOverdue),
      unpaidCount:
        sql<number>`count(*) filter (where ${invoices.paidStatus} != 'Completely')`.as(
          "unpaid_count"
        ),
    })
    .from(invoices)
    .groupBy(invoices.repName, invoices.repCode)
    .orderBy(desc(sum(invoices.paidAmount)));

  const result = rows.map((r) => {
    const totalGross = Number(r.totalGross ?? 0);
    const totalPaid = Number(r.totalPaid ?? 0);
    return {
      repName: r.repName,
      repCode: r.repCode,
      totalDue: Number(r.totalDue ?? 0),
      totalGross,
      totalPaid,
      invoiceCount: r.invoiceCount,
      avgDaysOverdue: Math.round(Number(r.avgDaysOverdue ?? 0)),
      unpaidCount: Number(r.unpaidCount ?? 0),
      collectionRate: totalGross > 0 ? (totalPaid / totalGross) * 100 : 0,
    };
  });

  return NextResponse.json(result);
}
