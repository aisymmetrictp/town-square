import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, uploadAudits } from "@/db/schema";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ValidationWarning {
  row: number;
  field: string;
  message: string;
}

function validateRow(
  r: Record<string, unknown>,
  rowNum: number
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  const gross = Number(r["Gross price"] ?? 0);
  const amountDue = Number(r["Amount due"] ?? 0);
  const days = Number(r["cDays_Overdue"] ?? 0);
  const email = r["Email"] ? String(r["Email"]).trim() : "";

  if (amountDue > gross && gross > 0) {
    warnings.push({
      row: rowNum,
      field: "Amount due",
      message: `Amount due ($${amountDue}) exceeds gross price ($${gross})`,
    });
  }

  if (days < 0) {
    warnings.push({
      row: rowNum,
      field: "cDays_Overdue",
      message: `Negative days overdue (${days})`,
    });
  }

  if (email && !EMAIL_RE.test(email)) {
    warnings.push({
      row: rowNum,
      field: "Email",
      message: `Malformed email: ${email}`,
    });
  }

  if (amountDue < 0) {
    warnings.push({
      row: rowNum,
      field: "Amount due",
      message: `Negative amount due ($${amountDue})`,
    });
  }

  return warnings;
}

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
      { error: "File contains no data", rowsInserted: 0, errors: [], validationWarnings: [] },
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
        validationWarnings: [],
      },
      { status: 400 }
    );
  }

  // Run validation on all rows first
  const allWarnings: ValidationWarning[] = [];
  for (let i = 0; i < rows.length; i++) {
    const rowWarnings = validateRow(rows[i], i + 2); // +2 for 1-indexed + header
    allWarnings.push(...rowWarnings);
  }

  const today = new Date();
  const snapshotDate = today.toISOString().split("T")[0];

  let rowsInserted = 0;
  const errors: string[] = [];
  let rowsSkipped = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const mapped: (typeof invoices.$inferInsert)[] = [];

    for (let j = 0; j < chunk.length; j++) {
      const r = chunk[j];
      const rowNum = i + j + 2;

      const repName = r["ContractSoldBy"];
      const invoiceNo = r["Invoice #"];
      const amountDue = r["Amount due"];
      const daysOverdue = r["cDays_Overdue"];

      if (!repName || !invoiceNo) {
        errors.push(
          `Row ${rowNum}: missing ContractSoldBy or Invoice #, skipped`
        );
        rowsSkipped++;
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

  // Write audit log
  const warningStrings = allWarnings.map(
    (w) => `Row ${w.row}: [${w.field}] ${w.message}`
  );

  try {
    await db.insert(uploadAudits).values({
      clerkId: rep.clerkId,
      uploadedBy: rep.repName,
      fileName: file.name,
      rowsTotal: rows.length,
      rowsInserted,
      rowsSkipped,
      snapshotDate,
      validationWarnings: warningStrings,
      errors,
    });
  } catch {
    // Don't fail the upload if audit logging fails
  }

  return NextResponse.json({
    rowsInserted,
    rowsSkipped,
    snapshotDate,
    errors,
    validationWarnings: warningStrings,
  });
}
