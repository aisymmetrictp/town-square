import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { repUsers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentRep() {
  const { userId } = await auth();
  if (!userId) return null;
  const [rep] = await db
    .select()
    .from(repUsers)
    .where(eq(repUsers.clerkId, userId));
  return rep ?? null;
}
