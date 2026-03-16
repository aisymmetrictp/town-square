import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { resolveViewAs } from "@/lib/view-as";
import { eq, and, lte, gt, gte, desc, SQL } from "drizzle-orm";
import { repActiveCondition } from "@/lib/rep-active-filter";

function bucketToCondition(bucket: string): SQL | undefined {
  switch (bucket) {
    case "Current":
      return lte(invoices.daysOverdue, 0);
    case "1-30d":
      return and(gt(invoices.daysOverdue, 0), lte(invoices.daysOverdue, 30));
    case "31-60d":
      return and(gt(invoices.daysOverdue, 30), lte(invoices.daysOverdue, 60));
    case "61-90d":
      return and(gt(invoices.daysOverdue, 60), lte(invoices.daysOverdue, 90));
    case "91-180d":
      return and(gt(invoices.daysOverdue, 90), lte(invoices.daysOverdue, 180));
    case "181-365d":
      return and(gt(invoices.daysOverdue, 180), lte(invoices.daysOverdue, 365));
    case "365+d":
      return gt(invoices.daysOverdue, 365);
    default:
      return undefined;
  }
}

export async function GET(req: NextRequest) {
  const result = await resolveViewAs(req);
  if (!result)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filterRepName } = result;
  const { searchParams } = new URL(req.url);
  const bucket = searchParams.get("bucket") ?? "";
  const status = searchParams.get("status") ?? "";

  const repActive = searchParams.get("repActive") ?? "";

  const conditions: SQL[] = [];
  if (filterRepName) {
    conditions.push(eq(invoices.repName, filterRepName));
  }
  if (bucket) {
    const bc = bucketToCondition(bucket);
    if (bc) conditions.push(bc);
  }
  if (status) {
    conditions.push(eq(invoices.paidStatus, status));
  }
  const rac = repActiveCondition(repActive);
  if (rac) conditions.push(rac);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(invoices)
    .where(where)
    .orderBy(desc(invoices.daysOverdue))
    .limit(500);

  return NextResponse.json(rows);
}
