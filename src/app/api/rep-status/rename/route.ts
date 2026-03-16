import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, repStatus } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";

export async function POST() {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rename Christina Shumway → Christina Wiley in all invoices
  const result = await db
    .update(invoices)
    .set({ repName: "Christina Wiley" })
    .where(eq(invoices.repName, "Christina Shumway"))
    .returning({ id: invoices.id });

  // Clean up rep_status: remove Christina Shumway entry if it exists
  await db
    .delete(repStatus)
    .where(eq(repStatus.repName, "Christina Shumway"));

  return NextResponse.json({
    renamed: result.length,
    from: "Christina Shumway",
    to: "Christina Wiley",
  });
}
