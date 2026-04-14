import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { cacheManager } from '../lib/cache';
import { formatCurrency, formatDate, formatNumber } from '../lib/formatters';
import Table from '../components/Table';
import Dialog from '../components/Dialog';
import ImportSODialog from '../components/ImportSODialog';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddStockDialog, setShowAddStockDialog] = useState(false);
  const [showImportSODialog, setShowImportSODialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('manual_adjustment');
  const [activeTab, setActiveTab] = useState('inventory');
  const [priceHistory, setPriceHistory] = useState({});
  const [selectedSkuForChart, setSelectedSkuForChart] = useState(null);

  useEffect(() => {
    fetchInventory();
    fetchPriceHistory();
    
    return () => {
      cacheManager.clearAll();
    };
  }, []);

  const fetchPriceHistory = async () => {
    try {
      // Fetch all PO items with product info and order dates
      const { data: poItems, error: poErr } = await supabase
        .from('purchase_order_items')
        .select(`
          id,
          unit_price,
          quantity,
          purchase_orders (
            order_date
          ),
          products (
            sku,
            name
          )
        `)
        .order('purchase_orders(order_date)', { ascending: true });

      if (poErr) throw poErr;

      // Group by SKU and sort by date
      const historyBySkU = {};
      poItems?.forEach(item => {
        const sku = item.products?.sku;
        const productName = item.products?.name;
        const price = parseFloat(item.unit_price) || 0;
        const date = item.purchase_orders?.order_date;

        if (sku && date) {
          if (!historyBySkU[sku]) {
            historyBySkU[sku] = {
              name: productName,
              data: []
            };
          }
          historyBySkU[sku].data.push({
            date,
            price,
            quantity: item.quantity
          });
        }
      });

      setPriceHistory(historyBySkU);
    } catch (err) {
      console.error('Error fetching price history:', err);
    }
  };

  // Fallback prices from PO average (weighted by quantity)
  const fallbackPrices = {
    '943-3': 490099.45,
    '981-2': 361911.29,
    '981-3': 361251.30,
    '662L-2': 330000.00,
    '662L-3': 327000.00,
    'HDMA2-2': 321000.00,
    '933-3': 301500.00,
    '933-2': 298989.04,
    '666-3': 292500.00
  };

  const fetchInventory = async () => {
    try {
      // Fetch all products
      const { data: allProducts, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (prodErr) throw prodErr;

      // Fetch inventory data
      const { data: invData, error: invErr } = await supabase
        .from('inventory')
        .select('*');

      if (invErr) throw invErr;

      // Create map of existing inventory
      const invMap = {};
      invData?.forEach(inv => {
        invMap[inv.product_id] = inv;
      });

      // Get all product IDs
      const productIds = allProducts.map(p => p.id);

      // Batch fetch all purchase_order_items for these products
      const { data: allPoItems, error: poErr } = await supabase
        .from('purchase_order_items')
        .select('id, product_id')
        .in('product_id', productIds);

      if (poErr) throw poErr;

      // Get all PO item IDs
      const poItemIds = allPoItems?.map(item => item.id) || [];

      // Batch fetch all received items from stock_receive_items
      let receivedByPoItem = {};
      if (poItemIds.length > 0) {
        const { data: received, error: recErr } = await supabase
          .from('stock_receive_items')
          .select('purchase_order_item_id, quantity_received')
          .in('purchase_order_item_id', poItemIds);

        if (recErr) throw recErr;

        received?.forEach(item => {
          if (!receivedByPoItem[item.purchase_order_item_id]) {
            receivedByPoItem[item.purchase_order_item_id] = 0;
          }
          receivedByPoItem[item.purchase_order_item_id] += item.quantity_received || 0;
        });
      }

      // Map PO items by product ID
      const poItemsByProduct = {};
      allPoItems?.forEach(item => {
        if (!poItemsByProduct[item.product_id]) {
          poItemsByProduct[item.product_id] = [];
        }
        poItemsByProduct[item.product_id].push(item.id);
      });

      // Build inventory list with all products
      const inventoryWithReceived = allProducts.map(product => {
        const inv = invMap[product.id] || {
          product_id: product.id,
          quantity_on_hand: 0,
          quantity_reserved: 0,
          quantity_available: 0
        };

        const poIds = poItemsByProduct[product.id] || [];
        const totalReceived = poIds.reduce((sum, poId) => sum + (receivedByPoItem[poId] || 0), 0);
        
        // Use product unit_price, fallback to PO average price if available
        const unitPrice = product.unit_price || fallbackPrices[product.sku] || 0;
        
        return {
          ...inv,
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          uom: product.uom || 'ZAK',
          unit_price: unitPrice,
          quantity_received: totalReceived,
          products: product
        };
      });

      setInventory(inventoryWithReceived);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = (product) => {
    setSelectedProduct(product);
    setAdjustmentQty(0);
    setAdjustmentReason('manual_adjustment');
    setShowAddStockDialog(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProduct || adjustmentQty === 0) {
      setError('Please enter adjustment quantity');
      return;
    }

    try {
      setLoading(true);

      // Check if inventory exists
      const { data: existing } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', selectedProduct.product_id)
        .single();

      if (existing) {
        // Update existing inventory
        const newQty = (existing.quantity_on_hand || 0) + adjustmentQty;
        const { error: err } = await supabase
          .from('inventory')
          .update({
            quantity_on_hand: newQty,
            quantity_available: newQty - (existing.quantity_reserved || 0)
          })
          .eq('product_id', selectedProduct.product_id);

        if (err) throw err;
      } else {
        // Create new inventory record
        const { error: err } = await supabase
          .from('inventory')
          .insert([{
            product_id: selectedProduct.product_id,
            quantity_on_hand: Math.max(0, adjustmentQty),
            quantity_reserved: 0,
            quantity_available: Math.max(0, adjustmentQty)
          }]);

        if (err) throw err;
      }

      setError('');
      setShowAddStockDialog(false);
      await fetchInventory();
    } catch (err) {
      setError(`Error adjusting stock: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'sku', label: 'SKU', width: '6%', render: (val) => val || '-' },
    { key: 'name', label: 'Product', width: '14%', render: (val) => val || '-' },
    { key: 'category', label: 'Category', width: '9%', render: (val) => val || '-' },
    { key: 'uom', label: 'UOM', width: '5%', render: (val) => val || 'ZAK' },
    { 
      key: 'quantity_on_hand', 
      label: 'On Hand', 
      width: '7%',
      render: (val) => <span className="font-medium">{val || 0}</span>
    },
    { 
      key: 'quantity_received', 
      label: 'Received', 
      width: '7%',
      render: (val) => <span className="text-blue-400 font-medium">{val || 0}</span>
    },
    { 
      key: 'quantity_reserved', 
      label: 'Reserved', 
      width: '7%',
      render: (val) => <span className="text-yellow-400">{val || 0}</span>
    },
    { 
      key: 'quantity_available', 
      label: 'Available', 
      width: '7%',
      render: (_, row) => {
        const onHand = row.quantity_on_hand || 0;
        const received = row.quantity_received || 0;
        const reserved = row.quantity_reserved || 0;
        const available = parseFloat((onHand + received - reserved).toFixed(2));
        const color = available < 0 ? 'text-red-400' : 'text-green-400';
        return <span className={color}>{available}</span>;
      }
    },
    { 
      key: 'unit_price', 
      label: 'Unit Price', 
      width: '9%',
      render: (val) => `Rp ${formatNumber(val || 0)}`
    },
    { 
      key: 'value', 
      label: 'Total Value', 
      width: '11%',
      render: (_, row) => {
        const onHand = row.quantity_on_hand || 0;
        const received = row.quantity_received || 0;
        const reserved = row.quantity_reserved || 0;
        const available = parseFloat((onHand + received - reserved).toFixed(2));
        const value = parseFloat(((row.unit_price || 0) * available).toFixed(2));
        return <span className="font-medium">{formatCurrency(value)}</span>;
      }
    },
    { key: 'created_at', label: 'Created', width: '9%', render: (val) => val ? formatDate(val) : '-' },
    {
      key: 'actions',
      label: 'Actions',
      width: '8%',
      render: (_, row) => (
        <button
          onClick={() => handleAddStock(row)}
          className="px-2 py-1 text-xs bg-green-500/30 text-green-200 hover:bg-green-500/50 rounded transition-smooth font-medium"
        >
          Add Stock
        </button>
      )
    }
  ];

  const calculateSummary = () => {
    if (!inventory || inventory.length === 0) {
      return {
        totalProducts: 0,
        totalValue: 0,
        totalOnHand: 0,
        totalAvailable: 0,
        totalReserved: 0,
        averageUnitPrice: 0,
        highValueItems: [],
        lowStockItems: [],
        overStockedItems: []
      };
    }

    let totalValue = 0;
    let totalOnHand = 0;
    let totalAvailable = 0;
    let totalReserved = 0;
    let totalPriceSum = 0;
    let itemsWithPrice = 0;

    const itemsWithValues = inventory.map(item => {
      const onHand = item.quantity_on_hand || 0;
      const received = item.quantity_received || 0;
      const reserved = item.quantity_reserved || 0;
      const available = parseFloat((onHand + received - reserved).toFixed(2));
      const unitPrice = item.unit_price || 0;
      const itemValue = parseFloat((unitPrice * available).toFixed(2));

      totalValue += itemValue;
      totalOnHand += onHand;
      totalAvailable += available;
      totalReserved += reserved;
      
      if (unitPrice > 0) {
        totalPriceSum += unitPrice;
        itemsWithPrice += 1;
      }

      return {
        ...item,
        available,
        itemValue
      };
    });

    // High value items (top 5)
    const highValueItems = itemsWithValues
      .sort((a, b) => b.itemValue - a.itemValue)
      .slice(0, 5);

    // Low stock items (available < 100)
    const lowStockItems = itemsWithValues
      .filter(item => item.available > 0 && item.available < 100)
      .sort((a, b) => a.available - b.available)
      .slice(0, 5);

    // Over-stocked items (available > 5000)
    const overStockedItems = itemsWithValues
      .filter(item => item.available > 5000)
      .sort((a, b) => b.available - a.available)
      .slice(0, 5);

    return {
      totalProducts: inventory.length,
      totalValue,
      totalOnHand,
      totalAvailable,
      totalReserved,
      averageUnitPrice: itemsWithPrice > 0 ? totalPriceSum / itemsWithPrice : 0,
      highValueItems,
      lowStockItems,
      overStockedItems
    };
  };

  const summary = calculateSummary();

  // Price Chart Component
  const PriceChart = ({ sku, data, productName }) => {
    if (!data || data.length === 0) return null;

    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    const prices = sortedData.map(d => parseFloat(d.price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    const chartHeight = 200;
    const chartWidth = Math.max(600, sortedData.length * 60);
    const padding = 40;
    const graphHeight = chartHeight - padding * 2;
    const graphWidth = chartWidth - padding * 2;

    // Calculate points for line chart
    const points = sortedData.map((d, idx) => {
      const x = padding + (idx / (sortedData.length - 1 || 1)) * graphWidth;
      const y = padding + graphHeight - ((parseFloat(d.price) - minPrice) / priceRange) * graphHeight;
      return { x, y, price: d.price, date: d.date, qty: d.quantity };
    });

    // Determine trend
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const priceTrend = lastPrice > firstPrice ? 'up' : lastPrice < firstPrice ? 'down' : 'stable';
    const trendColor = priceTrend === 'up' ? '#ef4444' : priceTrend === 'down' ? '#22c55e' : '#94a3b8';
    const trendPercent = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2);

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-2 bg-slate-800/50 rounded border border-slate-700/30">
            <p className="text-xs text-slate-400">Current Price</p>
            <p className="text-sm font-semibold text-white">Rp {formatNumber(lastPrice)}</p>
          </div>
          <div className="p-2 bg-slate-800/50 rounded border border-slate-700/30">
            <p className="text-xs text-slate-400">Average Price</p>
            <p className="text-sm font-semibold text-blue-400">Rp {formatNumber(avgPrice)}</p>
          </div>
          <div className="p-2 bg-slate-800/50 rounded border border-slate-700/30">
            <p className="text-xs text-slate-400">Min - Max</p>
            <p className="text-sm font-semibold text-slate-300">Rp {formatNumber(minPrice)} - {formatNumber(maxPrice)}</p>
          </div>
          <div className="p-2 bg-slate-800/50 rounded border border-slate-700/30">
            <p className="text-xs text-slate-400">Trend</p>
            <p className={`text-sm font-semibold ${priceTrend === 'up' ? 'text-red-400' : priceTrend === 'down' ? 'text-green-400' : 'text-slate-400'}`}>
              {priceTrend === 'up' ? '↑' : priceTrend === 'down' ? '↓' : '→'} {Math.abs(trendPercent)}%
            </p>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="overflow-x-auto">
          <svg width={chartWidth} height={chartHeight} className="bg-slate-800/30 rounded border border-slate-700/30">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padding + graphHeight * (1 - ratio);
              const price = minPrice + priceRange * ratio;
              return (
                <g key={idx}>
                  <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#334155" strokeDasharray="4" strokeWidth="1" opacity="0.5" />
                  <text x={padding - 35} y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                    Rp {formatNumber(price)}
                  </text>
                </g>
              );
            })}

            {/* Line chart */}
            {points.length > 1 && (
              <polyline
                points={points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data points */}
            {points.map((point, idx) => (
              <g key={idx}>
                <circle cx={point.x} cy={point.y} r="4" fill="#10b981" opacity="0.8" />
                <circle cx={point.x} cy={point.y} r="6" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.4" />
              </g>
            ))}

            {/* X-axis labels */}
            {points.map((point, idx) => {
              if (idx % Math.ceil(points.length / 5) === 0 || idx === points.length - 1) {
                const dateStr = new Date(sortedData[idx].date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                return (
                  <text key={`label-${idx}`} x={point.x} y={chartHeight - 10} fontSize="10" fill="#94a3b8" textAnchor="middle">
                    {dateStr}
                  </text>
                );
              }
              return null;
            })}
          </svg>
        </div>

        {/* Price History Table */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-300 mb-2">Purchase History ({sortedData.length} orders)</p>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800/50 border-b border-slate-700/30">
                <tr>
                  <th className="px-2 py-1 text-left text-slate-400">Date</th>
                  <th className="px-2 py-1 text-right text-slate-400">Price</th>
                  <th className="px-2 py-1 text-right text-slate-400">Qty</th>
                  <th className="px-2 py-1 text-right text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-700/20 hover:bg-slate-800/30">
                    <td className="px-2 py-1 text-slate-300">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-2 py-1 text-right text-green-400">Rp {formatNumber(item.price)}</td>
                    <td className="px-2 py-1 text-right text-slate-300">{formatNumber(item.quantity)}</td>
                    <td className="px-2 py-1 text-right text-blue-400">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Inventory Management</h1>
        <button 
          onClick={() => setShowImportSODialog(true)}
          className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-smooth font-medium"
        >
          + Import SO
        </button>
      </div>

      {error && <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-4 backdrop-blur-sm">{error}</div>}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 font-medium transition-smooth ${
            activeTab === 'inventory'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Inventory List
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 font-medium transition-smooth ${
            activeTab === 'summary'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Summary & Analytics
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-400">Loading...</p>
        </div>
      ) : activeTab === 'inventory' ? (
        <Table columns={columns} data={inventory} rowsPerPage={20} />
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-sm p-4 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Total Products</p>
              <p className="text-2xl font-bold text-white">{summary.totalProducts}</p>
              <p className="text-xs text-slate-500 mt-2">Active SKUs</p>
            </div>

            <div className="glass-sm p-4 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Total Inventory Value</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalValue)}</p>
              <p className="text-xs text-slate-500 mt-2">Current valuation</p>
            </div>

            <div className="glass-sm p-4 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Total Available</p>
              <p className="text-2xl font-bold text-blue-400">{formatNumber(summary.totalAvailable)}</p>
              <p className="text-xs text-slate-500 mt-2">Units ready to sell</p>
            </div>

            <div className="glass-sm p-4 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Reserved Stock</p>
              <p className="text-2xl font-bold text-yellow-400">{formatNumber(summary.totalReserved)}</p>
              <p className="text-xs text-slate-500 mt-2">Allocated units</p>
            </div>

            <div className="glass-sm p-4 rounded-lg border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">Avg Unit Price</p>
              <p className="text-2xl font-bold text-purple-400">Rp {formatNumber(summary.averageUnitPrice)}</p>
              <p className="text-xs text-slate-500 mt-2">Across all SKUs</p>
            </div>
          </div>

          {/* Analysis Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* High Value Items */}
            <div className="glass-sm p-5 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                Top 5 High Value Items
              </h3>
              <div className="space-y-3">
                {summary.highValueItems.length > 0 ? (
                  summary.highValueItems.map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-800/50 rounded border border-slate-700/30">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-white">{item.sku}</span>
                        <span className="text-xs text-red-400 font-semibold">{formatCurrency(item.itemValue)}</span>
                      </div>
                      <p className="text-xs text-slate-400">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatNumber(item.available)} units @ Rp {formatNumber(item.unit_price)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No items</p>
                )}
              </div>
            </div>

            {/* Low Stock Alert */}
            <div className="glass-sm p-5 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                Low Stock Alert (&lt;100 units)
              </h3>
              <div className="space-y-3">
                {summary.lowStockItems.length > 0 ? (
                  summary.lowStockItems.map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-800/50 rounded border border-slate-700/30">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-white">{item.sku}</span>
                        <span className="text-xs text-yellow-400 font-semibold">{formatNumber(item.available)} units</span>
                      </div>
                      <p className="text-xs text-slate-400">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-1">Value: {formatCurrency(item.itemValue)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No low stock items</p>
                )}
              </div>
            </div>

            {/* Over-stocked Items */}
            <div className="glass-sm p-5 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                Over-stocked Items (&gt;5000 units)
              </h3>
              <div className="space-y-3">
                {summary.overStockedItems.length > 0 ? (
                  summary.overStockedItems.map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-800/50 rounded border border-slate-700/30">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-white">{item.sku}</span>
                        <span className="text-xs text-blue-400 font-semibold">{formatNumber(item.available)} units</span>
                      </div>
                      <p className="text-xs text-slate-400">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-1">Value: {formatCurrency(item.itemValue)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No over-stocked items</p>
                )}
              </div>
            </div>
          </div>

          {/* Insights Section */}
          <div className="glass-sm p-5 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-white mb-4">Key Insights & Recommendations</h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-800/50 rounded border-l-2 border-green-400">
                <p className="font-medium text-green-400 mb-1">💰 Inventory Health</p>
                <p>Total inventory value is {formatCurrency(summary.totalValue)}. {summary.totalAvailable > 0 ? `You have ${formatNumber(summary.totalAvailable)} units available for sale.` : 'Consider restocking to meet demand.'}</p>
              </div>
              
              {summary.lowStockItems.length > 0 && (
                <div className="p-3 bg-slate-800/50 rounded border-l-2 border-yellow-400">
                  <p className="font-medium text-yellow-400 mb-1">⚠️ Stock Replenishment Needed</p>
                  <p>{summary.lowStockItems.length} product(s) have low stock levels (&lt;100 units). Prioritize reordering to avoid stockouts.</p>
                </div>
              )}

              {summary.overStockedItems.length > 0 && (
                <div className="p-3 bg-slate-800/50 rounded border-l-2 border-blue-400">
                  <p className="font-medium text-blue-400 mb-1">📦 Over-stocking Alert</p>
                  <p>{summary.overStockedItems.length} product(s) are over-stocked (&gt;5000 units). Consider promotional activities or adjusting purchase orders.</p>
                </div>
              )}

              <div className="p-3 bg-slate-800/50 rounded border-l-2 border-purple-400">
                <p className="font-medium text-purple-400 mb-1">📊 Inventory Metrics</p>
                <p>Average unit price: Rp {formatNumber(summary.averageUnitPrice)}. Reserved stock: {formatNumber(summary.totalReserved)} units ({summary.totalAvailable > 0 ? ((summary.totalReserved / (summary.totalAvailable + summary.totalReserved)) * 100).toFixed(1) : 0}% of total).</p>
              </div>
            </div>
          </div>
          {/* Price Fluctuation Charts */}
          <div className="glass-sm p-5 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-white mb-4">Price Fluctuation Analysis</h3>
            
            {Object.keys(priceHistory).length > 0 ? (
              <div className="space-y-6">
                {/* SKU Selector */}
                <div className="flex flex-wrap gap-2">
                  {Object.keys(priceHistory).map(sku => (
                    <button
                      key={sku}
                      onClick={() => setSelectedSkuForChart(selectedSkuForChart === sku ? null : sku)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-smooth ${
                        selectedSkuForChart === sku
                          ? 'bg-green-500/30 text-green-200 border border-green-400'
                          : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      {sku}
                    </button>
                  ))}
                </div>

                {/* Chart Display */}
                {selectedSkuForChart && priceHistory[selectedSkuForChart] && (
                  <PriceChart 
                    sku={selectedSkuForChart}
                    data={priceHistory[selectedSkuForChart].data}
                    productName={priceHistory[selectedSkuForChart].name}
                  />
                )}

                {!selectedSkuForChart && (
                  <p className="text-xs text-slate-400 text-center py-8">Select a SKU to view price fluctuation chart</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No price history data available</p>
            )}
          </div>
        </div>
      )}

      {/* Add Stock Dialog */}
      <Dialog
        isOpen={showAddStockDialog}
        title={`Add Stock - ${selectedProduct?.name}`}
        onClose={() => setShowAddStockDialog(false)}
        onSubmit={handleSaveAdjustment}
        submitLabel="Save Adjustment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Current Stock</label>
            <input
              type="number"
              value={selectedProduct?.quantity_on_hand || 0}
              disabled
              className="w-full px-3 py-1.5 glass-sm rounded-lg text-slate-400 opacity-50 cursor-not-allowed text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Adjustment Quantity *</label>
            <input
              type="number"
              value={adjustmentQty}
              onChange={(e) => setAdjustmentQty(parseFloat(e.target.value) || 0)}
              placeholder="Enter quantity to add/subtract"
              step="0.01"
              className="w-full px-3 py-1.5 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-xs"
            />
            <p className="text-xs text-slate-400 mt-1">Positive = add stock, Negative = reduce stock</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Reason</label>
            <select
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              className="w-full px-3 py-1.5 glass-sm rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 text-xs"
            >
              <option value="manual_adjustment">Manual Adjustment</option>
              <option value="stock_count">Stock Count</option>
              <option value="damage">Damage/Loss</option>
              <option value="return">Return from Customer</option>
              <option value="correction">Correction</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Stock</label>
            <input
              type="number"
              value={(selectedProduct?.quantity_on_hand || 0) + adjustmentQty}
              disabled
              className="w-full px-3 py-1.5 glass-sm rounded-lg text-green-400 font-medium text-xs"
            />
          </div>
        </div>
      </Dialog>

      <ImportSODialog
        isOpen={showImportSODialog}
        onClose={() => setShowImportSODialog(false)}
        onSuccess={() => {
          fetchInventory();
        }}
      />
    </div>
  );
}
