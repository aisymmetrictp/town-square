import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { repStatus, invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statuses = await db.select().from(repStatus).orderBy(repStatus.repName);
  return NextResponse.json(statuses);
}

export async function POST(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { repName, isActive } = body;

  if (!repName || typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "repName and isActive (boolean) required" },
      { status: 400 }
    );
  }

  // Upsert
  const [result] = await db
    .insert(repStatus)
    .values({ repName, isActive })
    .onConflictDoUpdate({
      target: repStatus.repName,
      set: { isActive, updatedAt: new Date() },
    })
    .returning();

  return NextResponse.json(result);
}
