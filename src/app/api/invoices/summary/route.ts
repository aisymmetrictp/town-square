import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq, sum, count, avg, sql, and, ne } from "drizzle-orm";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isManager = rep.role === "manager" || rep.role === "admin";

  const baseQuery = db
    .select({
      totalDue: sum(invoices.amountDue),
      totalGross: sum(invoices.grossPrice),
      totalPaid: sum(invoices.paidAmount),
      invoiceCount: count(),
      avgDaysOverdue: avg(invoices.daysOverdue),
      notPaidCount:
        sql<number>`count(*) filter (where ${invoices.paidStatus} != 'Completely')`.as(
          "not_paid_count"
        ),
    })
    .from(invoices);

  const query = isManager
    ? baseQuery
    : baseQuery.where(eq(invoices.repName, rep.repName));

  const [result] = await query;

  return NextResponse.json({
    totalDue: Number(result.totalDue ?? 0),
    totalGross: Number(result.totalGross ?? 0),
    totalPaid: Number(result.totalPaid ?? 0),
    invoiceCount: result.invoiceCount,
    avgDaysOverdue: Number(result.avgDaysOverdue ?? 0),
    notPaidCount: result.notPaidCount,
  });
}
