// CSV Parser untuk import data B2C/B2B pricing dari file klien

export const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const rows = lines.map(line => {
    // Handle CSV dengan comma dan quotes
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
  
  return rows;
};

// Helper: Parse price string (handle comma as thousand separator)
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  const cleaned = priceStr.toString().replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Parse B2C default pricing section
export const parseB2CDefaultPricing = (rows) => {
  const products = [];
  
  // Find header row (contains "Harga Locco")
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.some(cell => cell.includes('Harga Locco'))) {
      headerIdx = i;
      break;
    }
  }
  
  if (headerIdx === -1) return products;
  
  // Parse data rows (start from headerIdx + 1)
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Stop if we hit a section header or empty row
    if (!row[1] || row[1].includes('B2C') || row[1].includes('B2B')) break;
    
    // Skip if no SKU (column 2)
    if (!row[2]) continue;
    
    const product = {
      brand: row[1] || '',
      sku: row[2] || '',
      weight: parseFloat(row[3]) || 30,
      b2c_locco_price_kg: parsePrice(row[5]),
      b2c_franco_price_kg: parsePrice(row[6]),
      b2c_locco_price_zak: parsePrice(row[7]),
      b2c_franco_price_zak: parsePrice(row[8]),
      b2c_cash_price_kg: parsePrice(row[9]),
      b2c_top_30_price_kg: parsePrice(row[10]),
      b2c_cash_price_zak: parsePrice(row[11]),
      b2c_top_30_price_zak: parsePrice(row[12])
    };
    
    // Only add if has at least one price
    if (Object.values(product).some(v => typeof v === 'number' && v > 0)) {
      products.push(product);
    }
  }
  
  return products;
};

// Parse B2C customer custom pricing section
export const parseB2CCustomerPricing = (rows) => {
  const customers = [];
  
  // Find "B2C" section header (column 1 = "B2C", column 2 = "Harga Jual per SKU")
  let b2cIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === 'B2C' && rows[i][2] === 'Harga Jual per SKU') {
      b2cIdx = i;
      break;
    }
  }
  
  if (b2cIdx === -1) return customers;
  
  // Get SKU header row (next row after section header)
  const skuRow = rows[b2cIdx + 1];
  const skus = skuRow.slice(2).filter(s => s); // Skip first two columns
  
  // Parse customer rows
  for (let i = b2cIdx + 2; i < rows.length; i++) {
    const row = rows[i];
    
    // Stop if we hit B2B section or empty name
    if (!row[1] || row[1] === 'B2B') break;
    
    const customerName = row[1];
    const pricing = {};
    
    // Parse prices for each SKU
    for (let j = 0; j < skus.length; j++) {
      const price = parsePrice(row[j + 2]);
      if (price > 0) {
        pricing[skus[j]] = price;
      }
    }
    
    if (Object.keys(pricing).length > 0) {
      customers.push({
        name: customerName,
        type: 'B2C',
        pricing
      });
    }
  }
  
  return customers;
};

// Parse B2B customer custom pricing section
export const parseB2BCustomerPricing = (rows) => {
  const customers = [];
  
  // Find "B2B" section header
  let b2bIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === 'B2B' && rows[i][2] === 'Harga Jual per SKU') {
      b2bIdx = i;
      break;
    }
  }
  
  if (b2bIdx === -1) return customers;
  
  // Get SKU header row
  const skuRow = rows[b2bIdx + 1];
  const skus = skuRow.slice(2).filter(s => s);
  
  // Parse customer rows
  for (let i = b2bIdx + 2; i < rows.length; i++) {
    const row = rows[i];
    
    // Stop if empty name
    if (!row[1]) break;
    
    const customerName = row[1];
    const pricing = {};
    
    // Parse prices for each SKU
    for (let j = 0; j < skus.length; j++) {
      const price = parsePrice(row[j + 2]);
      if (price > 0) {
        pricing[skus[j]] = price;
      }
    }
    
    if (Object.keys(pricing).length > 0) {
      customers.push({
        name: customerName,
        type: 'B2B',
        pricing
      });
    }
  }
  
  return customers;
};

// Main parser function
export const parseDataFile = (csvText) => {
  const rows = parseCSV(csvText);
  
  return {
    b2cDefaultPricing: parseB2CDefaultPricing(rows),
    b2cCustomers: parseB2CCustomerPricing(rows),
    b2bCustomers: parseB2BCustomerPricing(rows)
  };
};
