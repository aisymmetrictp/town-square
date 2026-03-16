"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface AgingBucket {
  bucket: string;
  amountDue: number;
}

export const BUCKETS = [
  "Current",
  "1-30d",
  "31-60d",
  "61-90d",
  "91-180d",
  "181-365d",
  "365+d",
];

export function bucketFromDays(days: number): string {
  if (days <= 0) return "Current";
  if (days <= 30) return "1-30d";
  if (days <= 60) return "31-60d";
  if (days <= 90) return "61-90d";
  if (days <= 180) return "91-180d";
  if (days <= 365) return "181-365d";
  return "365+d";
}

export function AgingChart({ data }: { data: AgingBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <XAxis dataKey="bucket" />
        <YAxis
          tickFormatter={(v: number) => "$" + (v / 1000).toFixed(0) + "K"}
        />
        <Tooltip
          formatter={(v: number) => ["$" + v.toLocaleString(), "Amount Due"]}
        />
        <Bar dataKey="amountDue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
