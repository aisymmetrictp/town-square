import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { resolveViewAs } from "@/lib/view-as";
import { eq, sum, count, avg, sql, and, SQL } from "drizzle-orm";
import { repActiveCondition } from "@/lib/rep-active-filter";

export async function GET(req: NextRequest) {
  const viewAs = await resolveViewAs(req);
  if (!viewAs)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filterRepName } = viewAs;

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

  const repActive = req.nextUrl.searchParams.get("repActive") ?? "";
  const conditions: SQL[] = [];
  if (filterRepName) conditions.push(eq(invoices.repName, filterRepName));
  const rac = repActiveCondition(repActive);
  if (rac) conditions.push(rac);

  const query = conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery;

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
