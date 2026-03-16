import { NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .selectDistinct({
      repName: invoices.repName,
      repCode: invoices.repCode,
    })
    .from(invoices)
    .orderBy(invoices.repName);

  return NextResponse.json(rows);
}
