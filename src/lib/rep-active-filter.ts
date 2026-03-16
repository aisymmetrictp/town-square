import { sql, SQL } from "drizzle-orm";
import { invoices, repStatus } from "@/db/schema";

/**
 * Returns a SQL condition to filter invoices by rep active status.
 * @param repActive - "active", "inactive", or "" (all)
 * @returns SQL condition or undefined
 */
export function repActiveCondition(repActive: string): SQL | undefined {
  if (repActive === "active") {
    // Include reps that are active OR not in rep_status table (default to active)
    return sql`${invoices.repName} NOT IN (
      SELECT ${repStatus.repName} FROM ${repStatus} WHERE ${repStatus.isActive} = false
    )`;
  }
  if (repActive === "inactive") {
    return sql`${invoices.repName} IN (
      SELECT ${repStatus.repName} FROM ${repStatus} WHERE ${repStatus.isActive} = false
    )`;
  }
  return undefined;
}
