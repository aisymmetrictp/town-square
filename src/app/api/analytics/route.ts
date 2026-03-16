import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { sum, count, avg, sql, eq, desc, and, SQL } from "drizzle-orm";
import { bucketFromDays } from "@/lib/aging-buckets";
import { repActiveCondition } from "@/lib/rep-active-filter";

export async function GET(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repActive = req.nextUrl.searchParams.get("repActive") ?? "";
  const viewAs = req.nextUrl.searchParams.get("viewAs") ?? "";
  const rac = repActiveCondition(repActive);

  // Build combined filter from viewAs + repActive
  const filterConditions: SQL[] = [];
  if (viewAs) filterConditions.push(eq(invoices.repName, viewAs));
  if (rac) filterConditions.push(rac);
  const combinedFilter = filterConditions.length > 0 ? and(...filterConditions) : undefined;

  // 1. Cohort analysis by snapshot date
  const cohortsQuery = db
    .select({
      snapshotDate: invoices.snapshotDate,
      totalGross: sum(invoices.grossPrice),
      totalPaid: sum(invoices.paidAmount),
      totalDue: sum(invoices.amountDue),
      invoiceCount: count(),
      avgDays: avg(invoices.daysOverdue),
    })
    .from(invoices)
    .groupBy(invoices.snapshotDate)
    .orderBy(desc(invoices.snapshotDate));

  const cohorts = combinedFilter ? await cohortsQuery.where(combinedFilter) : await cohortsQuery;

  const cohortData = cohorts.map((c) => {
    const gross = Number(c.totalGross ?? 0);
    const paid = Number(c.totalPaid ?? 0);
    return {
      snapshotDate: c.snapshotDate,
      totalGross: gross,
      totalPaid: paid,
      totalDue: Number(c.totalDue ?? 0),
      invoiceCount: c.invoiceCount,
      avgDaysOverdue: Math.round(Number(c.avgDays ?? 0)),
      collectionRate: gross > 0 ? (paid / gross) * 100 : 0,
    };
  });

  // 2. Forecast: historical collection rates by aging bucket
  const allInvQuery = db
    .select({
      daysOverdue: invoices.daysOverdue,
      amountDue: invoices.amountDue,
      grossPrice: invoices.grossPrice,
      paidAmount: invoices.paidAmount,
      paidStatus: invoices.paidStatus,
    })
    .from(invoices);

  const allInvoices = combinedFilter ? await allInvQuery.where(combinedFilter) : await allInvQuery;

  // Group by bucket and calculate collection rates
  const bucketStats: Record<
    string,
    { totalGross: number; totalPaid: number; count: number }
  > = {};

  for (const inv of allInvoices) {
    const bucket = bucketFromDays(inv.daysOverdue ?? 0);
    if (!bucketStats[bucket]) {
      bucketStats[bucket] = { totalGross: 0, totalPaid: 0, count: 0 };
    }
    bucketStats[bucket].totalGross += Number(inv.grossPrice ?? 0);
    bucketStats[bucket].totalPaid += Number(inv.paidAmount ?? 0);
    bucketStats[bucket].count += 1;
  }

  const bucketRates = Object.entries(bucketStats).map(([bucket, stats]) => ({
    bucket,
    collectionRate:
      stats.totalGross > 0 ? (stats.totalPaid / stats.totalGross) * 100 : 0,
    totalGross: stats.totalGross,
    totalDue: stats.totalGross - stats.totalPaid,
    count: stats.count,
  }));

  // Simple forecast: project current AR by bucket using historical rates
  const currentDue = allInvoices.reduce(
    (s, inv) => s + Number(inv.amountDue ?? 0),
    0
  );
  const weightedCollectionRate =
    bucketRates.reduce(
      (s, b) => s + b.collectionRate * b.totalGross,
      0
    ) / Math.max(bucketRates.reduce((s, b) => s + b.totalGross, 0), 1);

  const forecast = {
    currentAR: currentDue,
    projectedCollection30d: currentDue * (weightedCollectionRate / 100) * 0.3,
    projectedCollection60d: currentDue * (weightedCollectionRate / 100) * 0.55,
    projectedCollection90d: currentDue * (weightedCollectionRate / 100) * 0.75,
    projectedAR30d:
      currentDue - currentDue * (weightedCollectionRate / 100) * 0.3,
    projectedAR60d:
      currentDue - currentDue * (weightedCollectionRate / 100) * 0.55,
    projectedAR90d:
      currentDue - currentDue * (weightedCollectionRate / 100) * 0.75,
    weightedCollectionRate,
  };

  // 3. Rep scorecard: current rate vs 90-day average
  const repStatsQuery = db
    .select({
      repName: invoices.repName,
      repCode: invoices.repCode,
      totalGross: sum(invoices.grossPrice),
      totalPaid: sum(invoices.paidAmount),
      totalDue: sum(invoices.amountDue),
      invoiceCount: count(),
      avgDays: avg(invoices.daysOverdue),
    })
    .from(invoices)
    .groupBy(invoices.repName, invoices.repCode);

  const repStats = combinedFilter ? await repStatsQuery.where(combinedFilter) : await repStatsQuery;

  const repScores = repStats.map((r) => {
    const gross = Number(r.totalGross ?? 0);
    const paid = Number(r.totalPaid ?? 0);
    const rate = gross > 0 ? (paid / gross) * 100 : 0;
    return {
      repName: r.repName,
      repCode: r.repCode,
      collectionRate: rate,
      totalDue: Number(r.totalDue ?? 0),
      invoiceCount: r.invoiceCount,
      avgDaysOverdue: Math.round(Number(r.avgDays ?? 0)),
    };
  });

  // Calculate mean and standard deviation
  const rates = repScores.map((r) => r.collectionRate);
  const meanRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const stdDev =
    rates.length > 1
      ? Math.sqrt(
          rates.reduce((s, r) => s + (r - meanRate) ** 2, 0) /
            (rates.length - 1)
        )
      : 0;

  const scorecards = repScores.map((r) => ({
    ...r,
    meanRate,
    stdDev,
    zScore: stdDev > 0 ? (r.collectionRate - meanRate) / stdDev : 0,
    isBelowBaseline: r.collectionRate < meanRate - stdDev,
    isAboveBaseline: r.collectionRate > meanRate + stdDev,
  }));

  return NextResponse.json({
    cohorts: cohortData,
    bucketRates,
    forecast,
    scorecards: scorecards.sort((a, b) => b.collectionRate - a.collectionRate),
    summary: { meanRate, stdDev },
  });
}
