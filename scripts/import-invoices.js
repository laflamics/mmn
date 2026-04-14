// Import datasalesmmn.csv → invoices + payments
// Logic:
//   Sisa Tagihan = 0                    → status 'paid'
//   Sisa Tagihan > 0 & Total Payment > 0 → status 'partial'
//   Sisa Tagihan > 0 & Total Payment = 0 → status 'sent' (belum bayar sama sekali)
//
// Untuk tiap invoice paid/partial → buat 1 record di payments table.
// Safe to re-run: orders yang sudah punya invoice akan di-skip.
//
// Usage: node scripts/import-invoices.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CSV_PATH = '/home/zelwar/Data2/mmn/masterdata/datasalesmmn.csv';

function parseNum(str) {
  if (!str || str.toString().trim() === '') return 0;
  return parseFloat(str.toString().replace(/,/g, '')) || 0;
}

// "01-08-2025" → "2025-08-01"  |  "31-12-25" → "2025-12-31"  (handle 2-digit year)
function parseDate(str) {
  if (!str || str.trim() === '') return null;
  const parts = str.trim().split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function main() {
  const content = readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`Parsed ${rows.length} rows from CSV\n`);

  // ── 1. Group rows by order number (take first row per order for header fields) ──
  const ordersMap = new Map(); // order_number → first row
  for (const row of rows) {
    const num = row['ID Pesanan']?.trim();
    if (!num) continue;
    if (!ordersMap.has(num)) ordersMap.set(num, row);
  }
  console.log(`Unique orders in CSV: ${ordersMap.size}`);

  // ── 2. Fetch existing sales_orders to map order_number → { id, customer_id } ──
  const { data: dbOrders, error: soErr } = await supabase
    .from('sales_orders')
    .select('id, order_number, customer_id');
  if (soErr) throw soErr;

  const soMap = new Map(dbOrders.map(o => [o.order_number, o])); // order_number → { id, customer_id }
  console.log(`Sales orders in DB: ${soMap.size}`);

  // ── 3. Fetch existing invoices to skip duplicates ──
  const { data: existingInvoices, error: invErr } = await supabase
    .from('invoices')
    .select('sales_order_id, invoice_number');
  if (invErr) throw invErr;

  const existingSOIds = new Set(existingInvoices.map(i => i.sales_order_id));
  const existingInvNums = new Set(existingInvoices.map(i => i.invoice_number));
  console.log(`Invoices already in DB: ${existingSOIds.size}\n`);

  let createdInvoices = 0;
  let createdPayments = 0;
  let skipped = 0;
  let errors = 0;
  let noOrder = 0;

  for (const [orderNum, row] of ordersMap) {
    const so = soMap.get(orderNum);
    if (!so) {
      console.warn(`  ✗ Sales order not found in DB: ${orderNum}`);
      noOrder++; continue;
    }

    if (existingSOIds.has(so.id)) {
      skipped++; continue;
    }

    const totalAmount    = parseNum(row['Total Price']);
    const cashPayment    = parseNum(row['Total Payment']);   // uang cash yang masuk
    const tabungan       = parseNum(row['Total Tabungan']); // potongan tabungan petani
    const discount       = parseNum(row['Potongan']);
    const sisaTagihan    = parseNum(row['Sisa Tagihan']);
    const invoiceDate    = parseDate(row['Tanggal kirim']);
    const dueDate        = parseDate(row['Jatuh Tempo']);
    const paymentDate    = parseDate(row['Tanggal Bayar']);

    // paid_amount = semua yg sudah settled (cash + tabungan)
    // pakai Total Price - Sisa Tagihan supaya konsisten walau ada tabungan
    const paidAmount = totalAmount - sisaTagihan;

    // Derive status dari Sisa Tagihan (sumber paling reliable)
    let status;
    if (sisaTagihan === 0) {
      status = 'paid';
    } else if (cashPayment > 0 || tabungan > 0) {
      status = 'partial'; // ada sebagian yang sudah dibayar
    } else {
      status = 'sent'; // belum ada pembayaran sama sekali
    }

    // Ensure unique invoice number
    let invoiceNumber = `INV-${orderNum}`;
    let suffix = 1;
    while (existingInvNums.has(invoiceNumber)) {
      invoiceNumber = `INV-${orderNum}-${suffix++}`;
    }
    existingInvNums.add(invoiceNumber);

    const invoiceData = {
      invoice_number:   invoiceNumber,
      sales_order_id:   so.id,
      customer_id:      so.customer_id,
      invoice_date:     invoiceDate,
      due_date:         dueDate,
      total_amount:     totalAmount,
      paid_amount:      paidAmount,
      discount_amount:  discount,
      status,
      last_payment_date: (status === 'paid' || status === 'partial') ? paymentDate : null,
    };

    try {
      const { data: newInv, error: insErr } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select('id')
        .single();
      if (insErr) throw insErr;

      existingSOIds.add(so.id);
      createdInvoices++;

      // ── Create payment record untuk cash yang masuk ──
      // cashPayment = Total Payment dari CSV (bukan termasuk tabungan)
      if (cashPayment > 0 && paymentDate) {
        const { error: payErr } = await supabase
          .from('payments')
          .insert([{
            invoice_id:       newInv.id,
            amount:           cashPayment,
            payment_method:   'Transfer',
            payment_date:     paymentDate,
            reference_number: orderNum,
          }]);
        if (payErr) throw payErr;
        createdPayments++;
      }

      if (createdInvoices % 100 === 0) {
        console.log(`  ... ${createdInvoices} invoices created`);
      }
    } catch (err) {
      console.error(`  ✗ Error on ${orderNum}:`, err.message);
      errors++;
    }
  }

  console.log('\n────────────────────────────────────');
  console.log(`Invoices created  : ${createdInvoices}`);
  console.log(`  - paid          : ${[...ordersMap.values()].filter(r => parseNum(r['Sisa Tagihan']) === 0 && parseNum(r['Total Payment']) > 0).length} (dari CSV)`);
  console.log(`  - partial       : ${[...ordersMap.values()].filter(r => parseNum(r['Sisa Tagihan']) > 0 && parseNum(r['Total Payment']) > 0).length} (dari CSV)`);
  console.log(`  - sent/unpaid   : ${[...ordersMap.values()].filter(r => parseNum(r['Total Payment']) === 0).length} (dari CSV)`);
  console.log(`Payments created  : ${createdPayments}`);
  console.log(`Skipped           : ${skipped} (already in DB)`);
  console.log(`No sales order    : ${noOrder}`);
  console.log(`Errors            : ${errors}`);
  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
