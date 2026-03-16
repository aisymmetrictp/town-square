import { NextResponse } from "next/server";
import { db } from "@/db";
import { uploadAudits } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { desc } from "drizzle-orm";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const audits = await db
    .select()
    .from(uploadAudits)
    .orderBy(desc(uploadAudits.createdAt))
    .limit(10);

  return NextResponse.json(audits);
}
