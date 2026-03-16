import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentRep } from "@/lib/auth";

// POST — send an email invitation (admin only)
export async function POST(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || rep.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
    });
    return NextResponse.json({ success: true, id: invitation.id });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to send invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
