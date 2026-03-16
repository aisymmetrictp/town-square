import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { repUsers } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq } from "drizzle-orm";

// GET — list all users (admin only)
export async function GET() {
  const rep = await getCurrentRep();
  if (!rep || rep.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const users = await db.select().from(repUsers).orderBy(repUsers.repName);
  return NextResponse.json(users);
}

// POST — create a new user mapping (admin only)
export async function POST(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || rep.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { clerkId, repName, repCode, role } = body;

  if (!clerkId || !repName || !repCode) {
    return NextResponse.json(
      { error: "clerkId, repName, and repCode are required" },
      { status: 400 }
    );
  }

  const validRoles = ["rep", "manager", "admin"];
  const userRole = validRoles.includes(role) ? role : "rep";

  const [newUser] = await db
    .insert(repUsers)
    .values({ clerkId, repName, repCode, role: userRole })
    .returning();

  return NextResponse.json(newUser);
}

// PATCH — update a user's role (admin only)
export async function PATCH(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || rep.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { id, role } = body;

  if (!id || !role) {
    return NextResponse.json(
      { error: "id and role are required" },
      { status: 400 }
    );
  }

  const validRoles = ["rep", "manager", "admin"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const [updated] = await db
    .update(repUsers)
    .set({ role })
    .where(eq(repUsers.id, id))
    .returning();

  return NextResponse.json(updated);
}

// DELETE — remove a user mapping (admin only)
export async function DELETE(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || rep.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Prevent self-deletion
  if (rep.id === id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  await db.delete(repUsers).where(eq(repUsers.id, id));
  return NextResponse.json({ success: true });
}
