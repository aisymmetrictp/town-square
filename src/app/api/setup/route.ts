import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { repUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

// Auto-registers any signed-in Clerk user as a manager.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Check if this user is already registered
  const existing = await db
    .select()
    .from(repUsers)
    .where(eq(repUsers.clerkId, userId));

  if (existing.length > 0) {
    return NextResponse.json({ message: "Already registered", user: existing[0] });
  }

  // Get the user's name from Clerk
  const clerkUser = await currentUser();
  const firstName = clerkUser?.firstName ?? "";
  const lastName = clerkUser?.lastName ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Manager";
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";

  // Register as manager
  const [newUser] = await db
    .insert(repUsers)
    .values({
      clerkId: userId,
      repName: fullName,
      repCode: email || "MANAGER",
      role: "manager",
    })
    .returning();

  return NextResponse.json({ message: "Registered as manager", user: newUser });
}
