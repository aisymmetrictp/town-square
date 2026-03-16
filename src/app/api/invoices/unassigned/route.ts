import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, repStatus } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { sql, desc } from "drizzle-orm";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all invoices where rep is inactive
  const rows = await db
    .select()
    .from(invoices)
    .where(
      sql`${invoices.repName} IN (
        SELECT ${repStatus.repName} FROM ${repStatus} WHERE ${repStatus.isActive} = false
      )`
    )
    .orderBy(invoices.repName, desc(invoices.amountDue));

  return NextResponse.json(rows);
}
