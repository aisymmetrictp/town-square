import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { resolveViewAs } from "@/lib/view-as";
import { eq, and, SQL } from "drizzle-orm";
import { repActiveCondition } from "@/lib/rep-active-filter";
import { BUCKETS, bucketFromDays } from "@/lib/aging-buckets";

export async function GET(req: NextRequest) {
  const result = await resolveViewAs(req);
  if (!result)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filterRepName } = result;

  const baseQuery = db
    .select({
      daysOverdue: invoices.daysOverdue,
      amountDue: invoices.amountDue,
    })
    .from(invoices);

  const repActive = req.nextUrl.searchParams.get("repActive") ?? "";
  const conditions: SQL[] = [];
  if (filterRepName) conditions.push(eq(invoices.repName, filterRepName));
  const rac = repActiveCondition(repActive);
  if (rac) conditions.push(rac);

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  const bucketMap: Record<string, number> = {};
  for (const b of BUCKETS) bucketMap[b] = 0;

  for (const row of rows) {
    const bucket = bucketFromDays(row.daysOverdue ?? 0);
    bucketMap[bucket] += Number(row.amountDue ?? 0);
  }

  const data = BUCKETS.map((bucket) => ({
    bucket,
    amountDue: Math.round(bucketMap[bucket] * 100) / 100,
  }));

  return NextResponse.json(data);
}
