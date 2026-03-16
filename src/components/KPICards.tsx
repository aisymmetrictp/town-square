"use client";

import { Card, Metric, Text, BadgeDelta } from "@tremor/react";

interface KPIData {
  totalDue: number;
  totalGross: number;
  totalPaid: number;
  invoiceCount: number;
  avgDaysOverdue: number;
  notPaidCount: number;
}

export function KPICards({ data }: { data: KPIData }) {
  const collectionRate =
    data.totalGross > 0
      ? ((data.totalPaid / data.totalGross) * 100).toFixed(1)
      : "0.0";

  const fmt = (v: number) =>
    `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <Text>Total Amount Due</Text>
        <Metric>{fmt(data.totalDue)}</Metric>
        <BadgeDelta deltaType="decrease">{collectionRate}% collected</BadgeDelta>
      </Card>
      <Card>
        <Text>Invoice Count</Text>
        <Metric>{data.invoiceCount.toLocaleString()}</Metric>
      </Card>
      <Card>
        <Text>Avg Days Overdue</Text>
        <Metric>{Math.round(data.avgDaysOverdue)}</Metric>
      </Card>
      <Card>
        <Text>Unpaid Invoices</Text>
        <Metric>{data.notPaidCount.toLocaleString()}</Metric>
        <BadgeDelta deltaType="increase">
          {data.invoiceCount > 0
            ? ((data.notPaidCount / data.invoiceCount) * 100).toFixed(1)
            : "0"}
          % unpaid
        </BadgeDelta>
      </Card>
    </div>
  );
}
