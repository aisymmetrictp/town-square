import { NextResponse } from "next/server";
import { db } from "@/db";
import { repStatus, invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { sql } from "drizzle-orm";

// Inactive reps from "Town Square Publisher Active Reps 3.16.26.xlsx"
// These are the yellow-highlighted rows in the spreadsheet
const INACTIVE_REPS = [
  "Adam Thatcher",
  "Alan Flinton",
  "Allen Reed",
  "Amanda Pierce",
  "Amy Faehr",
  "Angie Kirk",
  "April Fields",
  "Audra Booker",
  "Betty Ray",
  "Brittany Hirsch",
  "Chris Smith",
  "Dac Randall",
  "Dave Keene",
  "Doug McDonough",
  "Eric Zitron",
  "Joe Nugara",
  "John Davies",
  "Karen Disano",
  "Karen Trivette",
  "Kathy Chapman",
  "Keyra Lahley",
  "Kurt Kuras",
  "Lisa White",
  "Melissa Houser",
  "Phil Hageman",
  "Rhonda Hinton",
  "Steve Anderson",
  "Tom Myers",
];

export async function POST() {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all unique rep names from invoices
  const allReps = await db
    .selectDistinct({ repName: invoices.repName })
    .from(invoices);

  const inactiveSet = new Set(INACTIVE_REPS.map((n) => n.toLowerCase()));
  let inserted = 0;
  let updated = 0;

  for (const { repName } of allReps) {
    const isActive = !inactiveSet.has(repName.toLowerCase());

    const result = await db
      .insert(repStatus)
      .values({ repName, isActive })
      .onConflictDoUpdate({
        target: repStatus.repName,
        set: { isActive, updatedAt: new Date() },
      })
      .returning();

    if (result.length > 0) {
      inserted++;
    }
  }

  // Also insert any reps from the Excel that might not be in invoices yet
  for (const name of INACTIVE_REPS) {
    try {
      await db
        .insert(repStatus)
        .values({ repName: name, isActive: false })
        .onConflictDoUpdate({
          target: repStatus.repName,
          set: { isActive: false, updatedAt: new Date() },
        });
    } catch {
      // ignore duplicates
    }
  }

  const counts = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where ${repStatus.isActive} = true)`,
      inactive: sql<number>`count(*) filter (where ${repStatus.isActive} = false)`,
    })
    .from(repStatus);

  return NextResponse.json({
    seeded: inserted,
    ...counts[0],
  });
}
