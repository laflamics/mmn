import { formatCurrency, formatDate } from '../client/lib/formatters';

export default function DNTemplate({ deliveryNote, items, company = {} }) {
  const {
    name: companyName,
    company_name: companyNameSnake,
    address = 'Jl. Merdeka No. 123, Jakarta 12345',
    phone = '+62 21 1234 5678',
    email = 'info@binsis.co.id'
  } = company;

  const finalCompanyName = companyName || companyNameSnake || 'PT. BINSIS INDONESIA';
  const dnNumber = deliveryNote.dn_number || 'DN-000000';
  const soNumber = deliveryNote.sales_orders?.order_number || '-';
  const customerName = deliveryNote.sales_orders?.customers?.name || 'Customer';
  const customerAddress = deliveryNote.sales_orders?.customers?.address || '-';
  const customerPhone = deliveryNote.sales_orders?.customers?.phone || '-';
  const customerEmail = deliveryNote.sales_orders?.customers?.email || '-';
  const driverName = deliveryNote.driver_name || '-';
  const vehicleNumber = deliveryNote.vehicle_number || '-';
  const deliveryDate = deliveryNote.delivery_date || new Date().toISOString();
  const status = deliveryNote.status || 'pending';
  const notes = deliveryNote.notes || '';

  const statusLabel = {
    pending: 'PENDING',
    in_transit: 'IN TRANSIT',
    delivered: 'DELIVERED'
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
          <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', color: '#000' }}>SURAT JALAN</div>
          <div style={{ border: '1px solid #000', padding: '12px', borderRadius: '4px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#000' }}>DN Number</p>
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', color: '#000' }}>{dnNumber}</p>
          </div>
        </div>
      </div>

      {/* Delivery Info */}
      <div style={{ marginBottom: '32px' }}>
        {/* Customer and Delivery Details - Side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '24px' }}>
          {/* Customer Info */}
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', color: '#000' }}>Customer</h3>
            <div style={{ border: '1px solid #000', padding: '16px', borderRadius: '4px' }}>
              <p style={{ fontWeight: 'bold', margin: '0 0 8px 0', color: '#000' }}>{customerName}</p>
              <p style={{ fontSize: '12px', margin: '4px 0', whiteSpace: 'pre-wrap', color: '#000' }}>{customerAddress}</p>
              <p style={{ fontSize: '12px', margin: '8px 0 4px 0', color: '#000' }}>Phone: {customerPhone}</p>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>Email: {customerEmail}</p>
              <p style={{ fontSize: '12px', margin: '8px 0 0 0', color: '#000' }}>SO: {soNumber}</p>
            </div>
          </div>

          {/* Delivery Details */}
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', color: '#000' }}>Delivery Details</h3>
            <div style={{ border: '1px solid #000', padding: '16px', borderRadius: '4px' }}>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>
                <strong>Delivery Date:</strong> {formatDate(deliveryDate)}
              </p>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>
                <strong>Driver:</strong> {driverName}
              </p>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>
                <strong>Vehicle:</strong> {vehicleNumber}
              </p>
              <p style={{ fontSize: '12px', margin: '4px 0', color: '#000' }}>
                <strong>Status:</strong> {statusLabel[status] || status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px', color: '#000' }}>Delivery Items</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#000', color: '#fff' }}>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold' }}>No.</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold' }}>Product Description</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>SKU</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>Qty</th>
              <th style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>Received</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', fontWeight: 'bold', color: '#000' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', color: '#000' }}>{item.products?.name || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', textAlign: 'center', color: '#000' }}>{item.products?.sku || '-'}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', textAlign: 'center', color: '#000' }}>___</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {notes && (
        <div style={{ marginBottom: '32px', border: '1px solid #000', padding: '16px', borderRadius: '4px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', color: '#000' }}>Notes</p>
          <p style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: '#000', margin: '0' }}>{notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div style={{ borderTop: '2px solid #000', paddingTop: '24px', marginTop: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', textAlign: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '24px', color: '#000' }}>Prepared By</p>
            <div style={{ minHeight: '80px', marginBottom: '12px' }}></div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#000', margin: '0' }}>Warehouse Staff</p>
            <p style={{ fontSize: '11px', color: '#000', margin: '4px 0 0 0' }}>{formatDate(new Date())}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '24px', color: '#000' }}>Driver Signature</p>
            <div style={{ minHeight: '80px', marginBottom: '12px' }}></div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#000', margin: '0' }}>{driverName}</p>
            <p style={{ fontSize: '11px', color: '#000', margin: '4px 0 0 0' }}>Date: _______________</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '24px', color: '#000' }}>Customer Signature</p>
            <div style={{ minHeight: '80px', marginBottom: '12px' }}></div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#000', margin: '0' }}>Received By</p>
            <p style={{ fontSize: '11px', color: '#000', margin: '4px 0 0 0' }}>Date: _______________</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #000', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#000', margin: '0 0 4px 0' }}>
          This is an official Delivery Note (Surat Jalan) from {finalCompanyName}.
        </p>
        <p style={{ fontSize: '11px', color: '#000', margin: '4px 0 0 0' }}>
          For inquiries, contact: {email} | {phone}
        </p>
      </div>
    </div>
  );
}
