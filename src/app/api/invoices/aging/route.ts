import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { BUCKETS, bucketFromDays } from "@/components/AgingChart";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isManager = rep.role === "manager" || rep.role === "admin";

  const rows = isManager
    ? await db
        .select({
          daysOverdue: invoices.daysOverdue,
          amountDue: invoices.amountDue,
        })
        .from(invoices)
    : await db
        .select({
          daysOverdue: invoices.daysOverdue,
          amountDue: invoices.amountDue,
        })
        .from(invoices)
        .where(eq(invoices.repName, rep.repName));

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
