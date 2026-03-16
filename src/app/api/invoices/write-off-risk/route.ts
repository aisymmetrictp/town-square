import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { and, gte, ne, desc } from "drizzle-orm";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accounts 365+ days overdue that are not fully paid
  const rows = await db
    .select()
    .from(invoices)
    .where(
      and(
        gte(invoices.daysOverdue, 365),
        ne(invoices.paidStatus, "Completely")
      )
    )
    .orderBy(desc(invoices.daysOverdue));

  return NextResponse.json(rows);
}
