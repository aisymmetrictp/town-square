"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Re-export from shared lib so existing imports from this file still work
export { BUCKETS, bucketFromDays } from "@/lib/aging-buckets";

export interface AgingBucket {
  bucket: string;
  amountDue: number;
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
          formatter={(v) => ["$" + Number(v).toLocaleString(), "Amount Due"]}
        />
        <Bar dataKey="amountDue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
