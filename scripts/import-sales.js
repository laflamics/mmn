// Import datasalesmmn.csv → sales_orders + sales_order_items
// Usage: node scripts/import-sales.js
// Safe to re-run: orders already in DB are skipped.

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

// "82,620,000" → 82620000
function parseNum(str) {
  if (!str || str.toString().trim() === '') return 0;
  return parseFloat(str.toString().replace(/,/g, '')) || 0;
}

// "01-08-2025" → "2025-08-01"
function parseDate(str) {
  if (!str || str.trim() === '') return null;
  const parts = str.trim().split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function normalize(str) {
  return (str || '').trim().toLowerCase();
}

async function main() {
  const content = readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`Parsed ${rows.length} rows from CSV\n`);

  // ─── 1. Customers ────────────────────────────────────────────────────────────
  const uniqueCustomers = new Map(); // normalized name → first row
  for (const row of rows) {
    const key = normalize(row['Nama Petani']);
    if (key && !uniqueCustomers.has(key)) uniqueCustomers.set(key, row);
  }
  console.log(`Unique customers in CSV: ${uniqueCustomers.size}`);

  const { data: existingCusts, error: eErr } = await supabase
    .from('customers').select('id, name');
  if (eErr) throw eErr;

  const customerMap = new Map(existingCusts.map(c => [normalize(c.name), c.id]));

  const toInsertCusts = [];
  for (const [key, row] of uniqueCustomers) {
    if (!customerMap.has(key)) {
      const rawType = row['Kategori Buyer'] || '';
      toInsertCusts.push({
        name: row['Nama Petani'].trim(),
        type: rawType.includes('B2B') ? 'B2B' : 'B2C',
        phone: row['Nomer Telepon']?.trim() || null,
        address: row['Alamat Lengkap']?.trim() || null,
        city: row['Area']?.trim() || null,
        sales_person: row['Nama Sales']?.trim() || null,
      });
    }
  }

  if (toInsertCusts.length > 0) {
    console.log(`Creating ${toInsertCusts.length} new customers...`);
    const { data: newCusts, error: cErr } = await supabase
      .from('customers').insert(toInsertCusts).select('id, name');
    if (cErr) { console.error('Customer insert error:', cErr); throw cErr; }
    newCusts.forEach(c => customerMap.set(normalize(c.name), c.id));
  } else {
    console.log('All customers already exist, skipping.');
  }

  // ─── 2. Products ─────────────────────────────────────────────────────────────
  const uniqueSkus = new Map(); // sku → first row
  for (const row of rows) {
    const sku = row['SKU']?.trim();
    if (sku && !uniqueSkus.has(sku)) uniqueSkus.set(sku, row);
  }
  console.log(`\nUnique SKUs in CSV: ${uniqueSkus.size}`);

  const { data: existingProds, error: pErr } = await supabase
    .from('products').select('id, sku');
  if (pErr) throw pErr;

  const productMap = new Map(existingProds.map(p => [p.sku?.trim(), p.id]));

  const toInsertProds = [];
  for (const [sku, row] of uniqueSkus) {
    if (!productMap.has(sku)) {
      toInsertProds.push({
        sku,
        name: `${(row['Brand / Merek'] || '').trim()} ${sku}`.trim(),
        category: (row['Brand / Merek'] || '').trim() || 'Pupuk',
        unit_price: parseNum(row['Price']),
      });
    }
  }

  if (toInsertProds.length > 0) {
    console.log(`Creating ${toInsertProds.length} new products...`);
    const { data: newProds, error: prodErr } = await supabase
      .from('products').insert(toInsertProds).select('id, sku');
    if (prodErr) { console.error('Product insert error:', prodErr); throw prodErr; }
    newProds.forEach(p => productMap.set(p.sku?.trim(), p.id));
  } else {
    console.log('All products already exist, skipping.');
  }

  // ─── 3. Sales Orders ─────────────────────────────────────────────────────────
  // Group rows by ID Pesanan (one order may have multiple product lines)
  const ordersMap = new Map(); // order_number → rows[]
  for (const row of rows) {
    const num = row['ID Pesanan']?.trim();
    if (!num) continue;
    if (!ordersMap.has(num)) ordersMap.set(num, []);
    ordersMap.get(num).push(row);
  }
  console.log(`\nUnique order numbers in CSV: ${ordersMap.size}`);

  // Fetch existing order numbers to skip duplicates
  const { data: existingOrders, error: oErr } = await supabase
    .from('sales_orders').select('order_number');
  if (oErr) throw oErr;

  const existingNums = new Set(existingOrders.map(o => o.order_number));
  console.log(`Already in DB: ${existingNums.size} orders\n`);

  let created = 0, skipped = 0, errors = 0;

  for (const [orderNum, orderRows] of ordersMap) {
    if (existingNums.has(orderNum)) { skipped++; continue; }

    const first = orderRows[0];
    const custId = customerMap.get(normalize(first['Nama Petani']));
    if (!custId) {
      console.warn(`  ✗ No customer for order ${orderNum} (${first['Nama Petani']})`);
      errors++; continue;
    }

    // Build notes from metadata columns
    const noteParts = [];
    if (first['Nama Sales']?.trim()) noteParts.push(`Sales: ${first['Nama Sales'].trim()}`);
    if (first['Area']?.trim())       noteParts.push(`Area: ${first['Area'].trim()}`);
    if (first['DO Name']?.trim())    noteParts.push(`DO: ${first['DO Name'].trim()}`);
    if (first['Surat Jalan']?.trim()) noteParts.push(`SJ: ${first['Surat Jalan'].trim()}`);

    const orderData = {
      order_number:    orderNum,
      customer_id:     custId,
      order_date:      parseDate(first['Tanggal kirim']),
      total_amount:    parseNum(first['Total Price']),
      saving_amount:   parseNum(first['Total Tabungan']),
      discount_amount: parseNum(first['Potongan']),
      top_days:        parseInt(first['Tempo ( hari )']) || 30,
      payment_type:    (first['Kategori Buyer'] || '').includes('B2B') ? 'Term' : 'COD',
      status:          'confirmed',
      notes:           noteParts.length ? noteParts.join(' | ') : null,
    };

    try {
      const { data: newOrder, error: insErr } = await supabase
        .from('sales_orders').insert([orderData]).select('id').single();
      if (insErr) throw insErr;

      // Build items (one per CSV row in this order group)
      const items = [];
      for (const row of orderRows) {
        const sku = row['SKU']?.trim();
        const prodId = productMap.get(sku);
        if (!prodId) {
          console.warn(`  ✗ SKU not found: ${sku} (order ${orderNum})`);
          continue;
        }
        items.push({
          sales_order_id: newOrder.id,
          product_id:     prodId,
          quantity:       parseNum(row['Jumlah Sak']),
          unit_price:     parseNum(row['Price']),
          total_price:    parseNum(row['Total Price']),
        });
      }

      if (items.length > 0) {
        const { error: itemErr } = await supabase
          .from('sales_order_items').insert(items);
        if (itemErr) throw itemErr;
      }

      created++;
      if (created % 100 === 0) console.log(`  ... ${created} orders created`);
    } catch (err) {
      console.error(`  ✗ Error on ${orderNum}:`, err.message);
      errors++;
    }
  }

  console.log('\n────────────────────────────');
  console.log(`Created : ${created} orders`);
  console.log(`Skipped : ${skipped} (already in DB)`);
  console.log(`Errors  : ${errors}`);
  console.log('Done!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
