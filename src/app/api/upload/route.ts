import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { getCurrentRep } from "@/lib/auth";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const REQUIRED_COLUMNS = [
  "ContractSoldBy",
  "Invoice #",
  "Amount due",
  "cDays_Overdue",
];

const BATCH_SIZE = 500;

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

  // Parse file
  let rows: Record<string, unknown>[];

  if (file.name.toLowerCase().endsWith(".csv")) {
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
    return NextResponse.json(
      { error: "File contains no data", rowsInserted: 0, errors: [] },
      { status: 400 }
    );
  }

  // Validate required columns
  const fileColumns = Object.keys(rows[0]);
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !fileColumns.includes(col)
  );

  if (missingColumns.length > 0) {
    return NextResponse.json(
      {
        error: `Missing required columns: ${missingColumns.join(", ")}`,
        rowsInserted: 0,
        errors: missingColumns.map((col) => `Missing column: ${col}`),
      },
      { status: 400 }
    );
  }

  const today = new Date();
  const snapshotDate = today.toISOString().split("T")[0];

  let rowsInserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const mapped: (typeof invoices.$inferInsert)[] = [];

    for (let j = 0; j < chunk.length; j++) {
      const r = chunk[j];
      const rowNum = i + j + 2; // +2 for 1-indexed + header row

      const repName = r["ContractSoldBy"];
      const invoiceNo = r["Invoice #"];
      const amountDue = r["Amount due"];
      const daysOverdue = r["cDays_Overdue"];

      // Validate required fields have values
      if (!repName || !invoiceNo) {
        errors.push(
          `Row ${rowNum}: missing ContractSoldBy or Invoice #, skipped`
        );
        continue;
      }

      mapped.push({
        repCode: String(r["TSP_Rep_Code"] ?? ""),
        repName: String(repName),
        serverName: r["Server Name"] ? String(r["Server Name"]) : null,
        dateCreated: r["Date created"] ? String(r["Date created"]) : null,
        pubDate: r["_1st_publ._date"]
          ? String(r["_1st_publ._date"])
          : null,
        invoiceToCustNo: r["Invoice to cust. #"]
          ? String(r["Invoice to cust. #"])
          : null,
        customer: String(r["Order customer"] ?? ""),
        invoiceNo: String(invoiceNo),
        daysOverdue: Number(daysOverdue ?? 0),
        grossPrice:
          r["Gross price"] != null ? String(r["Gross price"]) : null,
        paidAmount:
          r["Paid amount"] != null ? String(r["Paid amount"]) : null,
        amountDue: amountDue != null ? String(amountDue) : null,
        paidStatus: r["Paid"] ? String(r["Paid"]) : null,
        contact: r["Contact"] ? String(r["Contact"]) : null,
        phone: r["Phone"] ? String(r["Phone"]) : null,
        email: r["Email"] ? String(r["Email"]) : null,
        snapshotDate,
      });
    }

    if (mapped.length > 0) {
      try {
        await db.insert(invoices).values(mapped);
        rowsInserted += mapped.length;
      } catch (err) {
        errors.push(
          `Batch starting at row ${i + 2} failed: ${err instanceof Error ? err.message : "unknown error"}`
        );
      }
    }
  }

  return NextResponse.json({
    rowsInserted,
    snapshotDate,
    errors,
  });
}
