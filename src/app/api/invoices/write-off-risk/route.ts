import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { and, gte, ne, desc, eq, SQL } from "drizzle-orm";
import { repActiveCondition } from "@/lib/rep-active-filter";

export async function GET(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repActive = req.nextUrl.searchParams.get("repActive") ?? "";
  const viewAs = req.nextUrl.searchParams.get("viewAs") ?? "";
  const rac = repActiveCondition(repActive);

  // Accounts 365+ days overdue that are not fully paid
  const conditions: SQL[] = [
    gte(invoices.daysOverdue, 365),
    ne(invoices.paidStatus, "Completely"),
  ];
  if (viewAs) conditions.push(eq(invoices.repName, viewAs));
  if (rac) conditions.push(rac);

  const rows = await db
    .select()
    .from(invoices)
    .where(and(...conditions))
    .orderBy(desc(invoices.daysOverdue));

  return NextResponse.json(rows);
}
