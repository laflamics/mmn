# Next Steps: Create Stock Receives Tables

## Current Status
- ✅ 175 Purchase Orders imported successfully
- ✅ All PO items and payments synced
- ❌ `stock_receives` and `stock_receive_items` tables don't exist yet

## What Needs to Be Done

### Step 1: Create Tables in Supabase (Manual)

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project (majalahabg)
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the entire SQL from `sqladd/CREATE_STOCK_RECEIVES_TABLE.sql`
6. Click **Run** to execute

This will create:
- `stock_receives` table - tracks inventory received from suppliers
- `stock_receive_items` table - tracks individual items received
- Indexes for performance
- RLS policies for security

### Step 2: Populate Stock Receives (Automatic)

Once the tables are created, run this command:

```bash
node datamaster/create_stock_receives_and_populate.js
```

This script will:
- Create a `stock_receives` record for each of the 175 POs
- Create `stock_receive_items` for each item in each PO
- Link everything to the correct suppliers and products
- Set received_date to the PO order_date

Expected output:
```
=== POPULATE STOCK RECEIVES FOR EXISTING POs ===

Step 1: Fetching existing purchase orders...
  ✓ Found 175 purchase orders

Step 2: Creating stock_receives records...
  ✓ Created 175 stock_receives...

=== SUMMARY ===
✓ Created: 175 stock_receives
⊘ Skipped: 0 (already exist)
Total: 175 POs processed
```

## Database Schema

### stock_receives
- `id` - UUID primary key
- `purchase_order_id` - FK to purchase_orders
- `supplier_id` - FK to suppliers
- `received_date` - When items were received
- `notes` - Additional notes
- `photo_url` - Photo of received goods
- `document_url` - Delivery proof document (Bukti Surat Jalan)
- `created_by` - User who created record
- `created_at`, `updated_at` - Timestamps

### stock_receive_items
- `id` - UUID primary key
- `stock_receive_id` - FK to stock_receives
- `purchase_order_item_id` - FK to purchase_order_items
- `product_id` - FK to products
- `quantity_received` - Quantity received
- `notes` - Item-specific notes
- `created_at` - Timestamp

## Flow After Completion

1. **Purchasing Module** - Shows POs with stock_receives status
2. **Inventory Module** - Shows received items from stock_receives
3. **Payments Module** - Shows AP payments linked to POs
4. **Reports** - Can track PO → Inventory → Payment flow

## Files Involved

- `sqladd/CREATE_STOCK_RECEIVES_TABLE.sql` - SQL to create tables
- `datamaster/create_stock_receives_and_populate.js` - Script to populate data
- `datamaster/POSuplier/Purchasemaster_renamed.csv` - Source data (already imported)
- `datamaster/import_purchase_orders_from_csv.js` - Original import script (reference)

## Troubleshooting

If you get an error when running the populate script:
- Make sure the SQL has been executed in Supabase
- Wait a few seconds for the schema cache to refresh
- Try running the script again

If you get "duplicate key" errors:
- The stock_receives already exist for that PO
- This is normal if you run the script multiple times
- The script will skip existing records
