import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { desc, count } from "drizzle-orm";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshots = await db
    .select({
      snapshotDate: invoices.snapshotDate,
      invoiceCount: count(),
    })
    .from(invoices)
    .groupBy(invoices.snapshotDate)
    .orderBy(desc(invoices.snapshotDate))
    .limit(3);

  return NextResponse.json(snapshots);
}
