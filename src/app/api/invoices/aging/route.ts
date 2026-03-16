import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { resolveViewAs } from "@/lib/view-as";
import { eq } from "drizzle-orm";
import { BUCKETS, bucketFromDays } from "@/components/AgingChart";

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

  const rows = filterRepName
    ? await baseQuery.where(eq(invoices.repName, filterRepName))
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
