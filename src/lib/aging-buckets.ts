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
