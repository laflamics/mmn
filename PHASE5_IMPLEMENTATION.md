# Phase 5: Plafond Control & B2B Pricing Implementation

## Overview
Implemented customer plafond (credit limit) management and B2B dynamic pricing system.

---

## Database Changes

### 1. New Table: `customer_product_pricing`
**File:** `sqladd/ADD_CUSTOMER_PRODUCT_PRICING.sql`

```sql
customer_product_pricing:
- id (PK)
- customer_id (FK to customers)
- product_id (FK to products)
- custom_price (DECIMAL)
- created_at
- updated_at
- UNIQUE(customer_id, product_id)
```

**Purpose:** Store B2B customer-specific product prices

---

## API Functions Added

**File:** `src/client/lib/api.js`

### Pricing Functions:
1. **`getProductPrice(customerId, productId)`**
   - Returns custom price if B2B customer has one
   - Falls back to product default price
   - Used when displaying prices in SO

2. **`saveCustomerProductPrice(customerId, productId, customPrice, overwrite)`**
   - `overwrite=true` → Update master pricing (upsert)
   - `overwrite=false` → Keep in SO only (insert if not exists)
   - Sales team chooses which option when creating SO

### Plafond Functions:
3. **`checkPlafondStatus(customerId)`**
   - Returns: `{ limit, used, remaining, usagePercent, isWarning, isBlocked, warningMessage }`
   - `isWarning` = true when usage >= 95%
   - `isBlocked` = true when usage >= 100%

4. **`updatePlafondUsed(customerId, soAmount)`**
   - Called when SO is created
   - Adds SO amount to customer's plafond_used

5. **`reducePlafondUsed(customerId, invoiceAmount)`**
   - Called when invoice is paid
   - Reduces plafond_used, allowing new SO

---

## Frontend Components

### 1. PlafondStatus Component
**File:** `src/client/components/PlafondStatus.jsx`

Displays:
- Status badge (🚫 Blocked / ⚠️ Warning / ✓ Available)
- Usage percentage and amounts
- Progress bar (red/yellow/green)
- Warning message

### 2. Enhanced Sales Page
**File:** `src/client/pages/Sales.jsx`

Features:
- Customer selector in create SO dialog
- Real-time plafond status check
- Blocks SO creation if plafond full
- Shows warning at 95% usage
- Displays remaining plafond amount

---

## Business Logic

### Plafond Flow:
```
1. Customer has plafond_limit (e.g., 10,000,000)
2. Sales creates SO → plafond_used increases
3. At 95% usage → Warning badge shown
4. At 100% usage → SO creation blocked
5. Invoice paid → plafond_used decreases
6. SO can be created again
```

### B2B Pricing Flow:
```
1. Sales creates SO for B2B customer
2. System checks customer_product_pricing table
3. If custom price exists → Use it
4. If not → Use product default price
5. Sales can override price in SO line item
6. After SO confirmed → Option to:
   - Save to master (overwrite=true) → Next SO uses this price
   - Keep in SO only (overwrite=false) → Master price unchanged
```

### B2C Pricing Flow:
```
1. Sales creates SO for B2C customer
2. Always use product default price
3. No custom pricing stored
4. Simple and consistent
```

---

## Next Steps

1. **Run SQL Migration:**
   ```sql
   -- Execute ADD_CUSTOMER_PRODUCT_PRICING.sql in Supabase
   ```

2. **Complete Sales Order Form:**
   - Add product selection with dynamic pricing
   - Add price override option
   - Add "Save to Master" checkbox
   - Implement SO creation with plafond update

3. **Update Invoice Payment:**
   - Call `reducePlafondUsed()` when invoice marked as paid

4. **Add to Sales Order List:**
   - Show customer type (B2B/B2C)
   - Show plafond status badge
   - Show warning indicator

---

## Files Modified/Created

**Created:**
- `sqladd/ADD_CUSTOMER_PRODUCT_PRICING.sql`
- `src/client/components/PlafondStatus.jsx`
- `PHASE5_IMPLEMENTATION.md`

**Modified:**
- `src/client/lib/api.js` (added 5 new functions)
- `src/client/pages/Sales.jsx` (enhanced with plafond checking)

---

## Status
✅ Database schema ready
✅ API functions implemented
✅ UI components created
⏳ Sales Order form completion pending
⏳ Invoice payment integration pending
