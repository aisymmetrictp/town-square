import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { sum, count, sql, gte, and, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    return NextResponse.json(
      { error: "SLACK_WEBHOOK_URL not configured" },
      { status: 500 }
    );
  }

  // Total AR
  const [totals] = await db
    .select({
      totalDue: sum(invoices.amountDue),
      totalGross: sum(invoices.grossPrice),
      totalPaid: sum(invoices.paidAmount),
      invoiceCount: count(),
    })
    .from(invoices);

  // High-value severely overdue (90+ days, $5K+)
  const highValue = await db
    .select()
    .from(invoices)
    .where(
      and(
        gte(invoices.daysOverdue, 90),
        sql`CAST(${invoices.amountDue} AS DECIMAL) >= 5000`,
        ne(invoices.paidStatus, "Completely")
      )
    );

  const totalDue = Number(totals.totalDue ?? 0);
  const collectionRate =
    Number(totals.totalGross) > 0
      ? ((Number(totals.totalPaid) / Number(totals.totalGross)) * 100).toFixed(
          1
        )
      : "0.0";

  const fmt = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  let highValueSection = "";
  if (highValue.length > 0) {
    const items = highValue
      .slice(0, 10)
      .map(
        (inv) =>
          `• *${inv.customer}* — ${fmt(Number(inv.amountDue ?? 0))} (${inv.daysOverdue}d overdue, ${inv.repName})`
      )
      .join("\n");
    highValueSection = `\n\n:rotating_light: *High-Value Overdue ($5K+, 90+ days):*\n${items}${
      highValue.length > 10
        ? `\n_...and ${highValue.length - 10} more_`
        : ""
    }`;
  }

  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: ":chart_with_upwards_trend: Daily AR Digest",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Total AR Outstanding:*\n${fmt(totalDue)}`,
          },
          {
            type: "mrkdwn",
            text: `*Collection Rate:*\n${collectionRate}%`,
          },
          {
            type: "mrkdwn",
            text: `*Total Invoices:*\n${totals.invoiceCount.toLocaleString()}`,
          },
          {
            type: "mrkdwn",
            text: `*Accounts 90+d & $5K+:*\n${highValue.length}`,
          },
        ],
      },
    ],
  };

  if (highValueSection) {
    (payload.blocks as unknown[]).push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: highValueSection,
      },
    });
  }

  try {
    const res = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Slack webhook failed", status: res.status },
        { status: 500 }
      );
    }

    return NextResponse.json({ sent: true, timestamp: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
