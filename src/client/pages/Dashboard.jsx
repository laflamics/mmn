import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/formatters';

export default function Dashboard() {
  const [dateFilter, setDateFilter] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [topProducts, setTopProducts] = useState([]);
  const [topSalespeople, setTopSalespeople] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [dailySalesChart, setDailySalesChart] = useState([]);
  const [dailyPurchaseChart, setDailyPurchaseChart] = useState([]);
  const [outstandingAR, setOutstandingAR] = useState([]);
  const [chartIsAllTime, setChartIsAllTime] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  const getDateRange = () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    switch (dateFilter) {
      case 'this_month':
        return { start: currentMonth, end: now };
      case 'last_month':
        return { start: lastMonthStart, end: lastMonthEnd };
      case 'all':
        return { start: new Date('2000-01-01'), end: now };
      default:
        return { start: currentMonth, end: now };
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const { start, end } = getDateRange();
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      // 1. Top 5 Products by Revenue
      const { data: salesItems } = await supabase
        .from('sales_order_items')
        .select('product_id, quantity, unit_price, sales_orders(order_date)')
        .gte('sales_orders.order_date', startStr)
        .lte('sales_orders.order_date', endStr);

      console.log('Top products - sales items fetched:', salesItems?.length);

      if (salesItems && salesItems.length > 0) {
        const productMap = {};
        salesItems.forEach(item => {
          if (!productMap[item.product_id]) {
            productMap[item.product_id] = { quantity: 0, revenue: 0 };
          }
          const itemRevenue = (item.quantity || 0) * (item.unit_price || 0);
          productMap[item.product_id].quantity += item.quantity || 0;
          productMap[item.product_id].revenue += itemRevenue;
        });

        const { data: products } = await supabase
          .from('products')
          .select('id, name, sku');

        const productsWithData = products
          ?.map(p => ({
            ...p,
            ...productMap[p.id]
          }))
          .filter(p => p.quantity > 0)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5) || [];

        setTopProducts(productsWithData);
      }

      // 2. Top Salespeople by Sales Amount
      // First get ALL customers to build complete map
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id, sales_person')
        .limit(10000);

      const customerMap = {};
      allCustomers?.forEach(c => {
        customerMap[c.id] = c.sales_person;
      });

      // Then get sales orders for the date range
      const { data: salesOrders } = await supabase
        .from('sales_orders')
        .select('id, total_amount, customer_id')
        .gte('order_date', startStr)
        .lte('order_date', endStr);

      if (salesOrders && salesOrders.length > 0) {
        const salesMap = {};
        salesOrders.forEach(order => {
          const salesperson = customerMap[order.customer_id] || 'Unknown';
          if (!salesMap[salesperson]) {
            salesMap[salesperson] = 0;
          }
          salesMap[salesperson] += order.total_amount || 0;
        });

        const topSales = Object.entries(salesMap)
          .map(([name, amount]) => ({
            name,
            amount
          }))
          .sort((a, b) => b.amount - a.amount);

        setTopSalespeople(topSales);
      }

      // 3. Total Sales
      const { data: allSales } = await supabase
        .from('sales_orders')
        .select('total_amount')
        .gte('order_date', startStr)
        .lte('order_date', endStr);

      const total = allSales?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      setTotalSales(total);

      // 4. Daily Sales Chart - fetch all time data
      try {
        const { data: allSalesData, error: salesErr } = await supabase
          .from('sales_orders')
          .select('order_date, total_amount');

        console.log('Sales chart data:', { count: allSalesData?.length, error: salesErr });

        if (!salesErr && allSalesData && allSalesData.length > 0) {
          const dailyMap = {};
          allSalesData.forEach(order => {
            if (order.order_date && order.total_amount !== null) {
              const date = order.order_date.split('T')[0];
              if (!dailyMap[date]) dailyMap[date] = 0;
              dailyMap[date] += order.total_amount;
            }
          });

          const chartData = Object.entries(dailyMap)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

          console.log('Sales chart processed:', { days: chartData.length, data: chartData.slice(-5) });
          setDailySalesChart(chartData);
          setChartIsAllTime(true);
        } else {
          console.log('No sales data or error:', salesErr);
        }
      } catch (err) {
        console.error('Error fetching sales chart:', err);
      }

      // 5. Daily Purchase Chart - fetch all time data
      try {
        const { data: allPurchaseData, error: purchaseErr } = await supabase
          .from('purchase_orders')
          .select('order_date, total_amount');

        console.log('Purchase chart data:', { count: allPurchaseData?.length, error: purchaseErr });

        if (!purchaseErr && allPurchaseData && allPurchaseData.length > 0) {
          const dailyMap = {};
          allPurchaseData.forEach(order => {
            if (order.order_date && order.total_amount !== null) {
              const date = order.order_date.split('T')[0];
              if (!dailyMap[date]) dailyMap[date] = 0;
              dailyMap[date] += order.total_amount;
            }
          });

          const chartData = Object.entries(dailyMap)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

          console.log('Purchase chart processed:', { days: chartData.length, data: chartData.slice(-5) });
          setDailyPurchaseChart(chartData);
        } else {
          console.log('No purchase data or error:', purchaseErr);
        }
      } catch (err) {
        console.error('Error fetching purchase chart:', err);
      }

      // 6. Outstanding AR (from invoices)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, customer_id')
        .gt('total_amount', 0);

      if (invoices) {
        const customerIds = [...new Set(invoices.map(i => i.customer_id))];
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, sales_person')
          .in('id', customerIds);

        const customerMap = {};
        customers?.forEach(c => {
          customerMap[c.id] = { name: c.name, salesperson: c.sales_person };
        });

        const outstanding = invoices
          .map(inv => ({
            invoiceId: inv.id,
            customer: customerMap[inv.customer_id]?.name || 'Unknown',
            salesperson: customerMap[inv.customer_id]?.salesperson || 'Unknown',
            outstanding: (inv.total_amount || 0) - (inv.paid_amount || 0)
          }))
          .filter(inv => inv.outstanding > 0)
          .sort((a, b) => b.outstanding - a.outstanding)
          .slice(0, 10);

        setOutstandingAR(outstanding);
      }
    } catch (err) {
      setError(`Error loading dashboard: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const LineChart = ({ data, title, color, isAllTime }) => {
    console.log('LineChart render:', { title, dataLength: data?.length, isAllTime });
    
    if (!data || data.length === 0) {
      return (
        <div className="glass rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
          <div className="h-40 flex items-center justify-center text-slate-400">
            No data available
          </div>
        </div>
      );
    }

    const amounts = data.map(d => d.amount).filter(a => a > 0);
    if (amounts.length === 0) {
      return (
        <div className="glass rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
          <div className="h-40 flex items-center justify-center text-slate-400">
            No data available
          </div>
        </div>
      );
    }

    const displayData = data.slice(-30); // Last 30 days
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const range = maxAmount - minAmount || 1;

    // SVG dimensions
    const width = 800;
    const height = 160;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Calculate points
    const points = displayData.map((item, idx) => {
      const x = padding + (idx / (displayData.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - ((item.amount - minAmount) / range) * chartHeight;
      return { x, y, amount: item.amount, date: item.date };
    });

    // Create path
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const lineColor = color === 'bg-green-500/70' ? '#22c55e' : '#f97316';

    return (
      <div className="glass rounded-xl p-6 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {isAllTime && <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-1 rounded">All Time</span>}
        </div>
        <div className="overflow-x-auto">
          <svg width={width} height={height} className="min-w-full">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
              <line
                key={`grid-${i}`}
                x1={padding}
                y1={padding + chartHeight * ratio}
                x2={width - padding}
                y2={padding + chartHeight * ratio}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4"
              />
            ))}
            
            {/* Line */}
            <path
              d={pathData}
              stroke={lineColor}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Points */}
            {points.map((p, i) => (
              <g key={`point-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill={lineColor}
                  opacity="0.8"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="1"
                  opacity="0"
                  className="hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <title>{`${p.date}: ${formatCurrency(p.amount)}`}</title>
                </circle>
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>{displayData[0]?.date}</span>
          <span>{displayData[displayData.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold gradient-text">Dashboard</h1>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 hover:border-slate-500 focus:border-blue-500 focus:outline-none"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Total Sales Card */}
      <div className="glass rounded-xl p-6 border border-slate-700 mb-8 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
        <p className="text-slate-400 text-sm mb-2">Total Sales Omset</p>
        <p className="text-4xl font-bold text-blue-400">{formatCurrency(totalSales)}</p>
      </div>

      {/* Top 5 Products & Top Salespeople */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top 5 Products */}
        <div className="glass rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">📦 Top 5 Products</h2>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product, idx) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{idx + 1}. {product.name}</p>
                    <p className="text-xs text-slate-400">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">{formatCurrency(product.revenue)}</p>
                    <p className="text-xs text-slate-400">{product.quantity} units</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Top Salespeople */}
        <div className="glass rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">👥 All Salespeople</h2>
          <div className="space-y-3">
            {topSalespeople.length > 0 ? (
              topSalespeople.map((person, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-semibold text-white">{person.name}</p>
                  </div>
                  <p className="text-sm font-bold text-green-400">{formatCurrency(person.amount)}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChart data={dailySalesChart} title="📈 Daily Sales Fluctuation" color="bg-green-500/70" isAllTime={chartIsAllTime} />
        <LineChart data={dailyPurchaseChart} title="📉 Daily Purchase Fluctuation" color="bg-orange-500/70" isAllTime={chartIsAllTime} />
      </div>

      {/* Outstanding AR */}
      <div className="glass rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">💰 Outstanding AR (Top 10)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Salesperson</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {outstandingAR.length > 0 ? (
                outstandingAR.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-200">{item.customer}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{item.salesperson}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-orange-400">
                      {formatCurrency(item.outstanding)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-4 py-3 text-center text-slate-400 text-sm">
                    No outstanding AR
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
