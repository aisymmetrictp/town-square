import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { resolveViewAs } from "@/lib/view-as";
import { eq, sum, count, avg, sql, desc, and, SQL } from "drizzle-orm";
import { repActiveCondition } from "@/lib/rep-active-filter";

export async function GET(req: NextRequest) {
  const viewAs = await resolveViewAs(req);
  if (!viewAs)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filterRepName } = viewAs;

  const baseQuery = db
    .select({
      repName: invoices.repName,
      repCode: invoices.repCode,
      totalDue: sum(invoices.amountDue),
      invoiceCount: count(),
      avgDaysOverdue: avg(invoices.daysOverdue),
      unpaidCount:
        sql<number>`count(*) filter (where ${invoices.paidStatus} != 'Completely')`.as(
          "unpaid_count"
        ),
    })
    .from(invoices)
    .groupBy(invoices.repName, invoices.repCode)
    .orderBy(desc(sum(invoices.amountDue)));

  const repActive = req.nextUrl.searchParams.get("repActive") ?? "";
  const conditions: SQL[] = [];
  if (filterRepName) conditions.push(eq(invoices.repName, filterRepName));
  const rac = repActiveCondition(repActive);
  if (rac) conditions.push(rac);

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  const result = rows.map((r) => ({
    repName: r.repName,
    repCode: r.repCode,
    totalDue: Number(r.totalDue ?? 0),
    invoiceCount: r.invoiceCount,
    avgDaysOverdue: Math.round(Number(r.avgDaysOverdue ?? 0)),
    unpaidCount: Number(r.unpaidCount ?? 0),
  }));

  return NextResponse.json(result);
}
