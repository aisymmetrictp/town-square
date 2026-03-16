import { pgTable, serial, text, numeric, integer, date, timestamp, json } from 'drizzle-orm/pg-core';

export const invoices = pgTable('invoices', {
  id:             serial('id').primaryKey(),
  repCode:        text('rep_code').notNull(),
  repName:        text('rep_name').notNull(),
  serverName:     text('server_name'),
  dateCreated:    date('date_created'),
  pubDate:        date('pub_date'),
  invoiceToCustNo: text('invoice_to_cust_no'),
  customer:       text('customer').notNull(),
  invoiceNo:      text('invoice_no').notNull(),
  daysOverdue:    integer('days_overdue').default(0),
  grossPrice:     numeric('gross_price', { precision: 10, scale: 2 }),
  paidAmount:     numeric('paid_amount', { precision: 10, scale: 2 }),
  amountDue:      numeric('amount_due', { precision: 10, scale: 2 }),
  paidStatus:     text('paid_status'),
  contact:        text('contact'),
  phone:          text('phone'),
  email:          text('email'),
  snapshotDate:   date('snapshot_date').notNull(),
  createdAt:      timestamp('created_at').defaultNow(),
});

export const uploadAudits = pgTable('upload_audits', {
  id:               serial('id').primaryKey(),
  clerkId:          text('clerk_id').notNull(),
  uploadedBy:       text('uploaded_by').notNull(),
  fileName:         text('file_name').notNull(),
  rowsTotal:        integer('rows_total').notNull(),
  rowsInserted:     integer('rows_inserted').notNull(),
  rowsSkipped:      integer('rows_skipped').notNull(),
  snapshotDate:     text('snapshot_date').notNull(),
  validationWarnings: json('validation_warnings').$type<string[]>().default([]),
  errors:           json('errors').$type<string[]>().default([]),
  createdAt:        timestamp('created_at').defaultNow(),
});

export const contactsLog = pgTable('contacts_log', {
  id:          serial('id').primaryKey(),
  invoiceId:   integer('invoice_id').notNull(),
  repClerkId:  text('rep_clerk_id').notNull(),
  repName:     text('rep_name').notNull(),
  note:        text('note'),
  contactedAt: timestamp('contacted_at').defaultNow(),
});

export const repUsers = pgTable('rep_users', {
  id:       serial('id').primaryKey(),
  clerkId:  text('clerk_id').notNull().unique(),
  repName:  text('rep_name').notNull(),
  repCode:  text('rep_code').notNull(),
  role:     text('role').default('rep'),   // 'rep' | 'manager' | 'admin'
});
