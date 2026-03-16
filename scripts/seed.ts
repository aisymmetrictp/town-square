import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as XLSX from 'xlsx';
import * as path from 'path';
import { invoices } from '../src/db/schema';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

const CLEAR = process.argv.includes('--clear');
const XLS_PATH = path.resolve(__dirname, '../../AgingReport030926.xls');
const SNAPSHOT_DATE = '2026-03-09'; // derived from filename 030926

async function main() {
  if (CLEAR) {
    console.log('Clearing invoices table...');
    await sql`DELETE FROM invoices`;
  }

  console.log(`Reading ${XLS_PATH}...`);
  const wb = XLSX.readFile(XLS_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  console.log(`Parsed ${rows.length} rows. Inserting...`);

  const BATCH_SIZE = 200;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({
      repCode:         String(r['TSP_Rep_Code'] ?? ''),
      repName:         String(r['ContractSoldBy'] ?? ''),
      serverName:      r['Server Name'] ? String(r['Server Name']) : null,
      dateCreated:     r['Date created'] ? String(r['Date created']) : null,
      pubDate:         r['_1st_publ._date'] ? String(r['_1st_publ._date']) : null,
      invoiceToCustNo: r['Invoice to cust. #'] ? String(r['Invoice to cust. #']) : null,
      customer:        String(r['Order customer'] ?? ''),
      invoiceNo:       String(r['Invoice #'] ?? ''),
      daysOverdue:     Number(r['cDays_Overdue'] ?? 0),
      grossPrice:      r['Gross price'] != null ? String(r['Gross price']) : null,
      paidAmount:      r['Paid amount'] != null ? String(r['Paid amount']) : null,
      amountDue:       r['Amount due'] != null ? String(r['Amount due']) : null,
      paidStatus:      r['Paid'] ? String(r['Paid']) : null,
      contact:         r['Contact'] ? String(r['Contact']) : null,
      phone:           r['Phone'] ? String(r['Phone']) : null,
      email:           r['Email'] ? String(r['Email']) : null,
      snapshotDate:    SNAPSHOT_DATE,
    }));

    await db.insert(invoices).values(batch);
    inserted += batch.length;
    process.stdout.write(`\r  ${inserted} / ${rows.length}`);
  }

  console.log(`\nDone! Inserted ${inserted} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
