import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactsLog } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { invoiceId, note } = body;

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }

  const [entry] = await db
    .insert(contactsLog)
    .values({
      invoiceId: Number(invoiceId),
      repClerkId: rep.clerkId,
      repName: rep.repName,
      note: note || null,
    })
    .returning();

  return NextResponse.json(entry);
}

export async function GET(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoiceId = req.nextUrl.searchParams.get("invoiceId");
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }

  const entries = await db
    .select()
    .from(contactsLog)
    .where(eq(contactsLog.invoiceId, Number(invoiceId)))
    .orderBy(desc(contactsLog.contactedAt))
    .limit(10);

  return NextResponse.json(entries);
}
