import { formatCurrency, formatDate } from '../client/lib/formatters';

export default function POTemplate({ order, supplier, items, company = {} }) {
  const {
    name: companyName,
    company_name: companyNameSnake,
    address = 'Jl. Merdeka No. 123, Jakarta 12345',
    phone = '+62 21 1234 5678',
    email = 'info@binsis.co.id'
  } = company;

  const finalCompanyName = companyName || companyNameSnake || 'PT. BINSIS INDONESIA';
  const shipTo = order.ship_to || address;

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax = order.tax_amount || 0;
  const discount = order.discount_amount || 0;
  const total = order.total_amount || subtotal;

  const paymentTerms = {
    COD: 'Cash on Delivery',
    TOP: `Terms of Payment - ${order.top_days || 30} Days`,
    CBD: 'Cash Before Delivery'
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: '32px' }}>
      {/* Header - Company Info with Logo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', paddingBottom: '24px', borderBottom: '2px solid #000', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flex: 1 }}>
          <img src="/mmn/mmn.png" alt="MMN Logo" style={{ width: '100px', height: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{finalCompanyName}</h1>
            <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>{address}</p>
            <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>Phone: {phone}</p>
            <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>Email: {email}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#000' }}>PURCHASE ORDER</div>
          <div style={{ border: '1px solid #000', padding: '12px', borderRadius: '4px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#000' }}>PO Number</p>
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', color: '#000' }}>{order.po_number}</p>
          </div>
        </div>
      </div>

      {/* Order Info */}
      <div style={{ marginBottom: '32px' }}>
        {/* Supplier and Ship To - Side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '24px' }}>
          {/* Supplier Info */}
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', color: '#000' }}>Supplier</h3>
            <div style={{ border: '1px solid #000', padding: '16px', borderRadius: '4px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 8px 0', color: '#000' }}>{supplier.name}</p>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>{supplier.address || '-'}</p>
              <p style={{ fontSize: '12px', margin: '8px 0 4px 0', color: '#000' }}>Contact: {supplier.contact_person || '-'}</p>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>Phone: {supplier.phone || '-'}</p>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>Email: {supplier.email || '-'}</p>
            </div>
          </div>

          {/* Ship To */}
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', color: '#000' }}>Ship To</h3>
            <div style={{ border: '1px solid #000', padding: '16px', borderRadius: '4px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 8px 0', color: '#000' }}>{finalCompanyName}</p>
              <p style={{ fontSize: '12px', margin: '4px 0', whiteSpace: 'pre-wrap', color: '#000' }}>{shipTo}</p>
            </div>
          </div>
        </div>

        {/* Delivery Order Date */}
        <div>
          <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', color: '#000' }}>Delivery Order Date</p>
          <p style={{ fontSize: '12px', color: '#000', margin: '0' }}>{order.delivery_date ? formatDate(order.delivery_date) : '_________________'}</p>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '32px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000', color: '#fff' }}>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold' }}>No.</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold' }}>Product Description</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>SKU</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>Qty</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>Unit Price</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', fontWeight: 'bold', color: '#000' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', color: '#000' }}>{item.products?.name || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', textAlign: 'center', color: '#000' }}>{item.products?.sku || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', textAlign: 'right', color: '#000' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>{formatCurrency(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
        <div style={{ width: '320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #000', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#000' }}>Subtotal</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#000' }}>{formatCurrency(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #000', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#000' }}>Tax (PPN)</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#000' }}>{formatCurrency(tax)}</span>
            </div>
          )}
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #000', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#000' }}>Discount</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#000' }}>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid #000', marginTop: '8px', backgroundColor: '#f5f5f5' }}>
            <span style={{ fontWeight: 'bold', color: '#000' }}>TOTAL</span>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div style={{ marginBottom: '32px', border: '1px solid #000', padding: '16px', borderRadius: '4px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', color: '#000' }}>Notes</p>
          <p style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: '#000', margin: '0' }}>{order.notes}</p>
        </div>
      )}

      {/* Terms & Conditions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        <div style={{ border: '1px solid #000', padding: '16px', borderRadius: '4px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', color: '#000' }}>Payment Terms</p>
          <ul style={{ fontSize: '11px', color: '#000', margin: '0', paddingLeft: '16px' }}>
            <li>Payment method: {paymentTerms[order.payment_type] || order.payment_type}</li>
            {order.payment_type === 'TOP' && <li>Due date: {order.top_days || 30} days from invoice date</li>}
          </ul>
        </div>

        <div style={{ border: '1px solid #000', padding: '16px', borderRadius: '4px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', color: '#000' }}>Delivery Terms</p>
          <ul style={{ fontSize: '11px', color: '#000', margin: '0', paddingLeft: '16px' }}>
            <li>Delivery: FOB Destination</li>
            <li>Shipping: Arranged by supplier</li>
            <li>Inspection: Upon receipt</li>
            <li>Quality: Per specification and standards</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '2px solid #000', paddingTop: '24px', marginTop: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', textAlign: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '24px', color: '#000' }}>Prepared By</p>
            <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              {order.prepared_by_signature_url ? (
                <img src={order.prepared_by_signature_url} alt="Prepared By Signature" style={{ maxHeight: '80px', maxWidth: '100%' }} />
              ) : (
                <div></div>
              )}
            </div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#000', margin: '0' }}>{order.prepared_by_name || 'Purchasing Team'}</p>
            <p style={{ fontSize: '10px', color: '#000', margin: '2px 0 0 0' }}>{order.prepared_by_position || ''}</p>
            <p style={{ fontSize: '11px', color: '#000', margin: '4px 0 0 0' }}>{formatDate(new Date())}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '24px', color: '#000' }}>Approved By</p>
            <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              {order.approved_by_signature_url ? (
                <img src={order.approved_by_signature_url} alt="Approved By Signature" style={{ maxHeight: '80px', maxWidth: '100%' }} />
              ) : (
                <div></div>
              )}
            </div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#000', margin: '0' }}>{order.approved_by_name || 'Manager'}</p>
            <p style={{ fontSize: '10px', color: '#000', margin: '2px 0 0 0' }}>{order.approved_by_position || ''}</p>
            <p style={{ fontSize: '11px', color: '#000', margin: '4px 0 0 0' }}>{formatDate(new Date())}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '24px', color: '#000' }}>Supplier Signature</p>
            <div style={{ minHeight: '80px', marginBottom: '12px' }}></div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#000', margin: '0' }}>Authorized Representative</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #000', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#000', margin: '0 0 4px 0' }}>
          This is an official Purchase Order from {finalCompanyName}. Please acknowledge receipt and confirm delivery schedule.
        </p>
        <p style={{ fontSize: '11px', color: '#000', margin: '4px 0 0 0' }}>
          For inquiries, contact: {email} | {phone}
        </p>
      </div>
    </div>
  );
}
