import { NextResponse } from "next/server";
import { getCurrentRep } from "@/lib/auth";

export async function GET() {
  const rep = await getCurrentRep();
  if (!rep) {
    return NextResponse.json({ error: "Not registered" }, { status: 401 });
  }
  return NextResponse.json(rep);
}
