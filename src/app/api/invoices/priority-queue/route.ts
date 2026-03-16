import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, contactsLog } from "@/db/schema";
import { resolveViewAs } from "@/lib/view-as";
import { eq, sql, desc, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const viewAs = await resolveViewAs(req);
  if (!viewAs)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filterRepName } = viewAs;

  // Composite risk score: daysOverdue (40%) + amountDue (35%) + paidStatus (25%)
  // Normalize each factor to 0-100 scale relative to the dataset
  // Only show unpaid/partially paid invoices
  const baseQuery = sql`
    WITH stats AS (
      SELECT
        MAX(days_overdue) AS max_days,
        MAX(CAST(amount_due AS DECIMAL)) AS max_amount
      FROM invoices
      WHERE paid_status != 'Completely'
      ${filterRepName ? sql`AND rep_name = ${filterRepName}` : sql``}
    ),
    scored AS (
      SELECT
        i.*,
        ROUND(
          (CASE WHEN s.max_days > 0 THEN (i.days_overdue::DECIMAL / s.max_days) * 40 ELSE 0 END) +
          (CASE WHEN s.max_amount > 0 THEN (CAST(i.amount_due AS DECIMAL) / s.max_amount) * 35 ELSE 0 END) +
          (CASE WHEN i.paid_status = 'Not at all' THEN 25 WHEN i.paid_status = 'Partially' THEN 12.5 ELSE 0 END),
          1
        ) AS risk_score,
        (
          SELECT MAX(cl.contacted_at)
          FROM contacts_log cl
          WHERE cl.invoice_id = i.id
        ) AS last_contacted
      FROM invoices i
      CROSS JOIN stats s
      WHERE i.paid_status != 'Completely'
      ${filterRepName ? sql`AND i.rep_name = ${filterRepName}` : sql``}
    )
    SELECT *
    FROM scored
    ORDER BY risk_score DESC
    LIMIT 20
  `;

  try {
    const rows = await db.execute(baseQuery);
    return NextResponse.json(rows.rows ?? rows);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}
