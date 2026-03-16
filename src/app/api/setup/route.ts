import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { repUsers } from "@/db/schema";
import { eq, count } from "drizzle-orm";

// Auto-registers the first signed-in user as a manager.
// Once a manager exists, this endpoint is disabled.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Check if any managers exist
  const [{ total }] = await db
    .select({ total: count() })
    .from(repUsers)
    .where(eq(repUsers.role, "manager"));

  if (total > 0) {
    return NextResponse.json(
      { error: "Setup already complete. A manager already exists." },
      { status: 403 }
    );
  }

  // Check if this user is already registered
  const existing = await db
    .select()
    .from(repUsers)
    .where(eq(repUsers.clerkId, userId));

  if (existing.length > 0) {
    return NextResponse.json({ message: "Already registered", user: existing[0] });
  }

  // Register as manager with access to all reps
  const [newUser] = await db
    .insert(repUsers)
    .values({
      clerkId: userId,
      repName: "Tyler Perleberg",
      repCode: "ADMIN",
      role: "manager",
    })
    .returning();

  return NextResponse.json({ message: "Registered as manager", user: newUser });
}
