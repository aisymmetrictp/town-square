import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceIds, newRepName, newRepCode } = await req.json();

  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0 || !newRepName) {
    return NextResponse.json(
      { error: "Missing invoiceIds or newRepName" },
      { status: 400 }
    );
  }

  const result = await db
    .update(invoices)
    .set({ repName: newRepName, repCode: newRepCode ?? "" })
    .where(inArray(invoices.id, invoiceIds))
    .returning({ id: invoices.id });

  return NextResponse.json({ updated: result.length });
}
