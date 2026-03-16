import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, eq, or, sql, ne } from "drizzle-orm";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Milestones that trigger automated notices
const MILESTONES = [30, 60, 90];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    );
  }

  const sent: { invoiceNo: string; email: string; milestone: number }[] = [];
  const errors: { invoiceNo: string; error: string }[] = [];

  for (const milestone of MILESTONES) {
    // Find invoices exactly at this milestone (±1 day to account for cron timing)
    const rows = await db
      .select()
      .from(invoices)
      .where(
        and(
          sql`${invoices.daysOverdue} BETWEEN ${milestone - 1} AND ${milestone + 1}`,
          ne(invoices.paidStatus, "Completely"),
          sql`${invoices.email} IS NOT NULL AND ${invoices.email} != ''`
        )
      );

    for (const inv of rows) {
      if (!inv.email) continue;

      try {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0f172a;color:white;padding:24px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;font-size:20px;">Payment Reminder</h1>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:14px;">Town Square Publications</p>
            </div>
            <div style="padding:24px;background:white;border:1px solid #e2e8f0;">
              <p style="color:#334155;">Dear ${inv.contact || "Valued Customer"},</p>
              <p style="color:#334155;">This is a friendly reminder that Invoice <strong>#${inv.invoiceNo}</strong> is now <strong>${inv.daysOverdue} days past due</strong>.</p>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
                <p style="margin:0;font-size:14px;color:#991b1b;">Outstanding Balance</p>
                <p style="margin:4px 0 0;font-size:28px;font-weight:bold;color:#dc2626;">$${Number(inv.amountDue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              </div>
              <p style="color:#334155;">Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this notice.</p>
              <p style="color:#334155;">If you have any questions about this invoice, please don't hesitate to contact us.</p>
              <p style="color:#64748b;font-size:14px;margin-top:24px;">Best regards,<br/>Town Square Publications</p>
            </div>
            <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">This is an automated reminder from Town Square Publications AR system.</p>
            </div>
          </div>
        `;

        await getResend().emails.send({
          from:
            process.env.RESEND_FROM ||
            "AR Department <noreply@townsquarepub.com>",
          to: inv.email,
          subject: `Payment Reminder — Invoice #${inv.invoiceNo} (${milestone} Days Past Due)`,
          html,
        });

        sent.push({
          invoiceNo: inv.invoiceNo,
          email: inv.email,
          milestone,
        });
      } catch (err) {
        errors.push({
          invoiceNo: inv.invoiceNo,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  return NextResponse.json({
    sent: sent.length,
    errors: errors.length,
    details: { sent, errors },
    timestamp: new Date().toISOString(),
  });
}
