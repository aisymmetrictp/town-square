import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import * as XLSX from "xlsx";
import { bucketFromDays } from "@/lib/aging-buckets";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ repName: string }> }
) {
  const rep = await getCurrentRep();
  if (!rep)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repName } = await params;
  const decodedRepName = decodeURIComponent(repName);

  // Reps can only export their own data
  const isManager = rep.role === "manager" || rep.role === "admin";
  if (!isManager && rep.repName !== decodedRepName) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.repName, decodedRepName))
    .orderBy(desc(invoices.daysOverdue));

  const data = rows.map((inv) => ({
    "Invoice #": inv.invoiceNo,
    Customer: inv.customer,
    "Rep Code": inv.repCode,
    "Rep Name": inv.repName,
    "Date Created": inv.dateCreated,
    "Pub Date": inv.pubDate,
    "Days Overdue": inv.daysOverdue,
    "Aging Bucket": bucketFromDays(inv.daysOverdue ?? 0),
    "Gross Price": Number(inv.grossPrice ?? 0),
    "Paid Amount": Number(inv.paidAmount ?? 0),
    "Amount Due": Number(inv.amountDue ?? 0),
    Status: inv.paidStatus,
    Contact: inv.contact,
    Phone: inv.phone,
    Email: inv.email,
    "Snapshot Date": inv.snapshotDate,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws["!cols"] = [
    { wch: 12 }, // Invoice #
    { wch: 40 }, // Customer
    { wch: 10 }, // Rep Code
    { wch: 28 }, // Rep Name
    { wch: 12 }, // Date Created
    { wch: 12 }, // Pub Date
    { wch: 14 }, // Days Overdue
    { wch: 12 }, // Aging Bucket
    { wch: 12 }, // Gross Price
    { wch: 12 }, // Paid Amount
    { wch: 12 }, // Amount Due
    { wch: 12 }, // Status
    { wch: 20 }, // Contact
    { wch: 16 }, // Phone
    { wch: 28 }, // Email
    { wch: 12 }, // Snapshot Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Invoices");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const safeName = decodedRepName.replace(/[^a-zA-Z0-9_\- ]/g, "");
  const filename = `${safeName}-invoices.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
