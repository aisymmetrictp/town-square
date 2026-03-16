"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

// Re-export from shared lib so existing imports from this file still work
export { BUCKETS, bucketFromDays } from "@/lib/aging-buckets";

export interface AgingBucket {
  bucket: string;
  amountDue: number;
}

const BUCKET_COLORS: Record<string, string> = {
  Current: "#10b981",
  "1-30d": "#34d399",
  "31-60d": "#fbbf24",
  "61-90d": "#f59e0b",
  "91-180d": "#f97316",
  "181-365d": "#ef4444",
  "365+d": "#dc2626",
};

function getBucketColor(bucket: string): string {
  return BUCKET_COLORS[bucket] ?? "#3B82F6";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: AgingBucket; value: number }>;
  label?: string;
  total: number;
}

function CustomTooltip({ active, payload, total }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const entry = payload[0];
  const bucket = entry.payload.bucket;
  const amount = entry.value;
  const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : "0.0";

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "0.5rem",
        boxShadow:
          "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
        padding: "0.75rem",
      }}
    >
      <p style={{ fontWeight: 600, margin: 0, marginBottom: 4 }}>{bucket}</p>
      <p
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          margin: 0,
          marginBottom: 2,
        }}
      >
        ${amount.toLocaleString()}
      </p>
      <p
        style={{
          fontSize: "0.75rem",
          color: "#64748b",
          margin: 0,
        }}
      >
        {pct}% of total
      </p>
    </div>
  );
}

interface AgingChartProps {
  data: AgingBucket[];
  onBucketClick?: (bucket: string) => void;
}

export function AgingChart({ data, onBucketClick }: AgingChartProps) {
  const total = data.reduce((sum, d) => sum + d.amountDue, 0);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => "$" + (v / 1000).toFixed(0) + "K"}
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={<CustomTooltip total={total} />}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
        />
        <Bar
          dataKey="amountDue"
          radius={[6, 6, 0, 0]}
          cursor={onBucketClick ? "pointer" : undefined}
          onClick={(_data: unknown, index: number) => {
            if (onBucketClick && data[index]) {
              onBucketClick(data[index].bucket);
            }
          }}
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={getBucketColor(entry.bucket)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
