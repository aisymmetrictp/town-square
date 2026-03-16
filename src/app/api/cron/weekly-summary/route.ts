import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, repUsers } from "@/db/schema";
import { eq, sum, count, avg, desc, sql, ne } from "drizzle-orm";
import { Resend } from "resend";
import { bucketFromDays } from "@/lib/aging-buckets";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all reps with their email (from Clerk) — for now we'll gather rep data
  const reps = await db.select().from(repUsers);

  const results: { repName: string; sent: boolean; error?: string }[] = [];

  for (const rep of reps) {
    try {
      // Get top 5 overdue accounts for this rep
      const topOverdue = await db
        .select()
        .from(invoices)
        .where(eq(invoices.repName, rep.repName))
        .orderBy(desc(invoices.daysOverdue))
        .limit(5);

      if (topOverdue.length === 0) continue;

      // Get this rep's collection stats
      const [stats] = await db
        .select({
          totalDue: sum(invoices.amountDue),
          totalGross: sum(invoices.grossPrice),
          totalPaid: sum(invoices.paidAmount),
          invoiceCount: count(),
          avgDays: avg(invoices.daysOverdue),
        })
        .from(invoices)
        .where(eq(invoices.repName, rep.repName));

      const collectionRate =
        Number(stats.totalGross) > 0
          ? ((Number(stats.totalPaid) / Number(stats.totalGross)) * 100).toFixed(1)
          : "0.0";

      // Check for bucket crossings (accounts 90+ days)
      const bucketCrossings = topOverdue.filter(
        (inv) => {
          const days = inv.daysOverdue ?? 0;
          return days === 30 || days === 60 || days === 90 || days === 180 || days === 365;
        }
      );

      // Build email HTML
      const fmt = (v: string | null) =>
        v
          ? `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : "$0.00";

      const topOverdueRows = topOverdue
        .map(
          (inv) =>
            `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${inv.customer}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${inv.invoiceNo}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(inv.amountDue)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:${(inv.daysOverdue ?? 0) > 90 ? '#dc2626' : '#f59e0b'};">${inv.daysOverdue}d</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${bucketFromDays(inv.daysOverdue ?? 0)}</td>
            </tr>`
        )
        .join("\n");

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0f172a;color:white;padding:24px;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;font-size:20px;">Weekly Collections Summary</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:14px;">${rep.repName} — ${new Date().toLocaleDateString()}</p>
          </div>

          <div style="padding:24px;background:white;border:1px solid #e2e8f0;">
            <div style="display:flex;gap:16px;margin-bottom:24px;">
              <div style="flex:1;background:#f8fafc;padding:16px;border-radius:8px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#64748b;">Collection Rate</p>
                <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#0f172a;">${collectionRate}%</p>
              </div>
              <div style="flex:1;background:#f8fafc;padding:16px;border-radius:8px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#64748b;">Total Due</p>
                <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#dc2626;">${fmt(stats.totalDue)}</p>
              </div>
              <div style="flex:1;background:#f8fafc;padding:16px;border-radius:8px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#64748b;">Invoices</p>
                <p style="margin:4px 0 0;font-size:24px;font-weight:bold;color:#0f172a;">${stats.invoiceCount}</p>
              </div>
            </div>

            <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a;">Top 5 Overdue Accounts</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0;">Customer</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0;">Invoice</th>
                  <th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0;">Due</th>
                  <th style="padding:8px 12px;text-align:right;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0;">Days</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;border-bottom:2px solid #e2e8f0;">Bucket</th>
                </tr>
              </thead>
              <tbody>
                ${topOverdueRows}
              </tbody>
            </table>
          </div>

          <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">Town Square Publications — AR Dashboard</p>
          </div>
        </div>
      `;

      // For now, log the email. In production, you'd look up the rep's email from Clerk.
      // We'll send to an admin email or skip if no RESEND_API_KEY
      if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
        await getResend().emails.send({
          from: process.env.RESEND_FROM || "AR Dashboard <noreply@townsquarepub.com>",
          to: process.env.ADMIN_EMAIL,
          subject: `Weekly AR Summary — ${rep.repName}`,
          html,
        });
        results.push({ repName: rep.repName, sent: true });
      } else {
        results.push({ repName: rep.repName, sent: false, error: "No RESEND_API_KEY or ADMIN_EMAIL configured" });
      }
    } catch (err) {
      results.push({
        repName: rep.repName,
        sent: false,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() });
}
