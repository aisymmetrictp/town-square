import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const rep = await getCurrentRep();
  if (!rep || (rep.role !== "manager" && rep.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let rows: Record<string, unknown>[];

  if (file.name.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    rows = parsed.data;
  } else {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "File contains no data" }, { status: 400 });
  }

  // Derive snapshot date from today
  const today = new Date();
  const snapshotDate = today.toISOString().split("T")[0];

  const BATCH_SIZE = 200;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      repCode: String(r["TSP_Rep_Code"] ?? ""),
      repName: String(r["ContractSoldBy"] ?? ""),
      serverName: r["Server Name"] ? String(r["Server Name"]) : null,
      dateCreated: r["Date created"] ? String(r["Date created"]) : null,
      pubDate: r["_1st_publ._date"] ? String(r["_1st_publ._date"]) : null,
      invoiceToCustNo: r["Invoice to cust. #"]
        ? String(r["Invoice to cust. #"])
        : null,
      customer: String(r["Order customer"] ?? ""),
      invoiceNo: String(r["Invoice #"] ?? ""),
      daysOverdue: Number(r["cDays_Overdue"] ?? 0),
      grossPrice: r["Gross price"] != null ? String(r["Gross price"]) : null,
      paidAmount: r["Paid amount"] != null ? String(r["Paid amount"]) : null,
      amountDue: r["Amount due"] != null ? String(r["Amount due"]) : null,
      paidStatus: r["Paid"] ? String(r["Paid"]) : null,
      contact: r["Contact"] ? String(r["Contact"]) : null,
      phone: r["Phone"] ? String(r["Phone"]) : null,
      email: r["Email"] ? String(r["Email"]) : null,
      snapshotDate,
    }));

    await db.insert(invoices).values(batch);
    inserted += batch.length;
  }

  return NextResponse.json({ count: inserted, snapshotDate });
}
