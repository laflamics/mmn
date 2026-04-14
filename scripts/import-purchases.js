// Import purchase.csv (header) + puchasedetail.csv (items) →
//   purchase_orders + purchase_order_items
//   + stock_receives + stock_receive_items
//   + inventory (quantity_on_hand += QTY per SKU, recompute reserved/available)
//
// Payment: only last installment (cols 15 / 16) is imported.
// Safe to re-run: POs already in DB (by po_number) are skipped.
//
// Usage: node scripts/import-purchases.js

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

const CSV_HEADER  = '/home/zelwar/Data2/mmn/masterdata/purchase.csv';
const CSV_DETAIL  = '/home/zelwar/Data2/mmn/masterdata/puchasedetail.csv';

// "96,145,000" → 96145000  |  "-" → 0
function parseNum(str) {
  if (!str || str.toString().trim() === '' || str.toString().trim() === '-') return 0;
  return parseFloat(str.toString().replace(/,/g, '')) || 0;
}

// "09 Jul 2025" or "04 Sep 2025" → "2025-09-04"
function parseDate(str) {
  if (!str || str.trim() === '' || str.trim() === '-') return null;
  const d = new Date(str.trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

async function main() {
  // ── Parse header CSV (array mode – duplicate column names) ───────────────────
  const headerContent = readFileSync(CSV_HEADER, 'utf-8');
  const headerRaw = parse(headerContent, { columns: false, skip_empty_lines: true, trim: true });
  const [_header, ...headerRows] = headerRaw; // skip header row

  // Build map: DO number → raw row array
  const headerMap = new Map();
  for (const row of headerRows) {
    const doNum = row[0]?.trim();
    if (doNum) headerMap.set(doNum, row);
  }
  console.log(`Header CSV: ${headerMap.size} purchase orders\n`);

  // ── Parse detail CSV ──────────────────────────────────────────────────────────
  const detailContent = readFileSync(CSV_DETAIL, 'utf-8');
  const detailRows = parse(detailContent, { columns: true, skip_empty_lines: true, trim: true });

  // Group detail rows by Reference (DO number)
  const detailMap = new Map(); // DO number → rows[]
  for (const row of detailRows) {
    const ref = row['Reference']?.trim();
    if (!ref) continue;
    if (!detailMap.has(ref)) detailMap.set(ref, []);
    detailMap.get(ref).push(row);
  }
  console.log(`Detail CSV: ${detailRows.length} rows across ${detailMap.size} references\n`);

  // ── 1. Ensure all SKUs from detail CSV exist as products ──────────────────────
  const { data: existingProds, error: pErr } = await supabase
    .from('products').select('id, sku, name, category');
  if (pErr) throw pErr;

  const productMap = new Map(existingProds.map(p => [p.sku?.trim(), p.id]));

  // Collect missing SKUs
  const brandBySku = new Map(); // sku → brand name from detail CSV
  for (const row of detailRows) {
    const sku = row['SKU']?.trim();
    const brand = row['Brand']?.trim();
    if (sku && brand && !brandBySku.has(sku)) brandBySku.set(sku, brand);
  }

  const toCreate = [];
  for (const [sku, brand] of brandBySku) {
    if (!productMap.has(sku)) {
      // Compute unit_price from first occurrence in detail
      const sampleRow = detailRows.find(r => r['SKU']?.trim() === sku);
      const unitPrice = parseNum(sampleRow?.['Price / Sak']);
      toCreate.push({ sku, name: `${brand} ${sku}`, category: brand, unit_price: unitPrice });
    }
  }

  if (toCreate.length > 0) {
    console.log(`Creating ${toCreate.length} missing products:`);
    toCreate.forEach(p => console.log(`  ${p.sku} (${p.category})`));
    const { data: newProds, error: prodErr } = await supabase
      .from('products').insert(toCreate).select('id, sku');
    if (prodErr) throw prodErr;
    newProds.forEach(p => productMap.set(p.sku, p.id));
  } else {
    console.log('All SKUs already exist in DB.');
  }

  // ── 2. Supplier map ───────────────────────────────────────────────────────────
  const { data: suppliers, error: sErr } = await supabase
    .from('suppliers').select('id, name');
  if (sErr) throw sErr;
  const supplierMap = new Map(suppliers.map(s => [s.name.trim(), s.id]));
  console.log(`\nSuppliers: ${[...supplierMap.keys()].join(', ')}`);

  // ── 3. Fetch existing PO numbers ──────────────────────────────────────────────
  const { data: existingPOs, error: poErr } = await supabase
    .from('purchase_orders').select('po_number');
  if (poErr) throw poErr;
  const existingPONums = new Set(existingPOs.map(p => p.po_number));
  console.log(`POs already in DB: ${existingPONums.size}\n`);

  let createdPOs = 0;
  let createdPayments = 0;
  let skipped = 0;
  let errors = 0;

  // Track quantity received per product_id for inventory
  const receivedQtyMap = new Map(); // product_id → total QTY

  for (const [doNum, row] of headerMap) {
    if (existingPONums.has(doNum)) { skipped++; continue; }

    const supplierName = row[3]?.trim();
    const supplierId   = supplierMap.get(supplierName);
    if (!supplierId) {
      console.warn(`  ✗ Supplier not found: "${supplierName}" (${doNum})`);
      errors++; continue;
    }

    const arrivalDate = parseDate(row[6]);       // Arrival Date
    const dueDateRaw  = parseDate(row[7]);       // Due Date
    const topDays     = (() => {
      if (!arrivalDate || !dueDateRaw) return 60;
      const a = new Date(arrivalDate), b = new Date(dueDateRaw);
      return Math.round((b - a) / (1000 * 60 * 60 * 24));
    })();
    const rupiah      = parseNum(row[8]);        // total Rupiah
    const lastPayAmt  = parseNum(row[15]);       // last payment amount
    const lastPayDate = parseDate(row[16]);      // last payment date
    const potongan    = parseNum(row[17]);       // discount/potongan
    const balance     = parseNum(row[18]);       // Balance
    const note        = row[19]?.trim();         // 'Lunas' or ''

    const area      = row[1]?.trim();
    const salesName = row[4]?.trim();

    const isLunas  = note === 'Lunas' || balance <= 0;
    const status   = isLunas ? 'received' : 'pending';

    const noteParts = [];
    if (area)      noteParts.push(`Area: ${area}`);
    if (salesName) noteParts.push(`Sales: ${salesName}`);

    // Get detail items for this DO
    const items = detailMap.get(doNum) || [];
    if (items.length === 0) {
      console.warn(`  ✗ No detail rows for ${doNum}`);
      errors++; continue;
    }

    try {
      // Insert purchase_order
      const { data: newPO, error: poInsErr } = await supabase
        .from('purchase_orders')
        .insert([{
          po_number:     doNum,
          supplier_id:   supplierId,
          order_date:    arrivalDate,
          delivery_date: arrivalDate,
          total_amount:  rupiah,
          status,
          notes:         noteParts.length ? noteParts.join(' | ') : null,
          payment_type:  'TOP',
          top_days:      topDays,
        }])
        .select('id')
        .single();
      if (poInsErr) throw poInsErr;

      existingPONums.add(doNum);

      // Build purchase_order_items from detail CSV
      const poItems = [];
      for (const dRow of items) {
        const sku     = dRow['SKU']?.trim();
        const qty     = parseNum(dRow['QTY']);
        const price   = parseNum(dRow['Price / Sak']);
        const total   = parseNum(dRow['Total Net Price']); // use Net (includes logistics)
        const prodId  = productMap.get(sku);

        if (!prodId) {
          console.warn(`  ✗ SKU not found: ${sku} (${doNum})`);
          continue;
        }

        poItems.push({
          purchase_order_id: newPO.id,
          product_id:        prodId,
          quantity:          qty,
          unit_price:        price,
          total_price:       total,
        });

        // Accumulate for inventory
        receivedQtyMap.set(prodId, (receivedQtyMap.get(prodId) || 0) + qty);
      }

      if (poItems.length > 0) {
        const { data: newItems, error: itemErr } = await supabase
          .from('purchase_order_items')
          .insert(poItems)
          .select('id, product_id, quantity');
        if (itemErr) throw itemErr;

        // Insert stock_receive
        const { data: newSR, error: srErr } = await supabase
          .from('stock_receives')
          .insert([{
            purchase_order_id: newPO.id,
            supplier_id:       supplierId,
            received_date:     arrivalDate,
            notes:             noteParts.length ? noteParts.join(' | ') : null,
          }])
          .select('id')
          .single();
        if (srErr) throw srErr;

        // Insert stock_receive_items (one per purchase_order_item)
        const srItems = newItems.map((item) => ({
          stock_receive_id:       newSR.id,
          purchase_order_item_id: item.id,
          product_id:             item.product_id,
          quantity_received:      item.quantity,
        }));

        const { error: sriErr } = await supabase
          .from('stock_receive_items').insert(srItems);
        if (sriErr) throw sriErr;
      }

      createdPOs++;

      // Create payment record for last installment
      if (lastPayAmt > 0 && lastPayDate) {
        const { error: payErr } = await supabase
          .from('payments')
          .insert([{
            purchase_order_id: newPO.id,
            supplier_id:       supplierId,
            invoice_id:        null,
            amount:            lastPayAmt,
            paid_amount:       lastPayAmt,
            discount:          potongan,
            payment_date:      lastPayDate,
            payment_method:    'Transfer',
            payment_type:      'ap',
            reference_number:  doNum,
            status:            isLunas ? 'completed' : 'pending',
          }]);
        if (payErr) throw payErr;
        createdPayments++;
      }

      if (createdPOs % 50 === 0) {
        console.log(`  ... ${createdPOs} POs created`);
      }
    } catch (err) {
      console.error(`  ✗ Error on ${doNum}:`, err.message);
      errors++;
    }
  }

  console.log(`\nPOs created     : ${createdPOs}`);
  console.log(`Payments created: ${createdPayments}`);
  console.log(`Skipped         : ${skipped} (already in DB)`);
  console.log(`Errors          : ${errors}`);

  // ── 4. Update inventory ───────────────────────────────────────────────────────
  console.log('\n── Updating inventory ──');

  // Compute reserved per product from sales_order_items
  const { data: salesItems, error: siErr } = await supabase
    .from('sales_order_items').select('product_id, quantity');
  if (siErr) throw siErr;

  const reservedMap = new Map();
  for (const item of salesItems) {
    reservedMap.set(item.product_id, (reservedMap.get(item.product_id) || 0) + item.quantity);
  }

  // Fetch existing inventory
  const { data: invRecords, error: invErr } = await supabase
    .from('inventory').select('id, product_id, quantity_on_hand');
  if (invErr) throw invErr;
  const invMap = new Map(invRecords.map(r => [r.product_id, r]));

  // All product_ids that need inventory entries
  const allProductIds = new Set([
    ...receivedQtyMap.keys(),
    ...reservedMap.keys(),
    ...invMap.keys(),
  ]);

  let invUpdated = 0;
  let invCreated = 0;

  for (const productId of allProductIds) {
    const onHand   = receivedQtyMap.get(productId) || 0;
    const reserved = reservedMap.get(productId) || 0;
    const available = onHand - reserved;
    const existing  = invMap.get(productId);

    if (existing) {
      const { error: updErr } = await supabase
        .from('inventory')
        .update({
          quantity_on_hand:   onHand,
          quantity_reserved:  reserved,
          quantity_available: available,
          last_updated:       new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updErr) console.error(`  ✗ Inv update (product ${productId}):`, updErr.message);
      else invUpdated++;
    } else {
      const { error: insErr } = await supabase
        .from('inventory')
        .insert([{
          product_id:         productId,
          quantity_on_hand:   onHand,
          quantity_reserved:  reserved,
          quantity_available: available,
          last_updated:       new Date().toISOString(),
        }]);
      if (insErr) console.error(`  ✗ Inv insert (product ${productId}):`, insErr.message);
      else invCreated++;
    }
  }

  console.log(`Inventory updated: ${invUpdated}`);
  console.log(`Inventory created: ${invCreated}`);

  // Print inventory summary (products with received stock)
  const { data: allProds } = await supabase.from('products').select('id, sku, name');
  const prodById = new Map(allProds.map(p => [p.id, p]));

  console.log('\n── Received qty per SKU ──');
  const sorted = [...receivedQtyMap.entries()].sort((a, b) => b[1] - a[1]);
  for (const [pid, qty] of sorted) {
    const p = prodById.get(pid) || { sku: `?${pid}`, name: '?' };
    const reserved = reservedMap.get(pid) || 0;
    console.log(`  ${p.name} (${p.sku}): on_hand=${qty.toLocaleString()} | reserved=${reserved.toLocaleString()} | available=${(qty-reserved).toLocaleString()}`);
  }

  console.log('\nDone!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
