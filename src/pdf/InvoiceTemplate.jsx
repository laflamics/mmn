import { formatCurrency, formatDate } from '../client/lib/formatters';

export default function InvoiceTemplate({ invoice, items, company = {} }) {
  const {
    name: companyName,
    company_name: companyNameSnake,
    address = 'Jl. Merdeka No. 123, Jakarta 12345',
    phone = '+62 21 1234 5678',
    email = 'info@binsis.co.id'
  } = company;

  const finalCompanyName = companyName || companyNameSnake || 'PT. BINSIS INDONESIA';
  const invoiceNumber = invoice.invoice_number || 'INV-000000';
  const customerName = invoice.customers?.name || 'Customer';
  const customerAddress = invoice.customers?.address || '-';
  const customerPhone = invoice.customers?.phone || '-';
  const invoiceDate = invoice.invoice_date || new Date().toISOString();
  const dueDate = invoice.due_date || new Date().toISOString();
  const totalAmount = invoice.total_amount || 0;
  const paidAmount = invoice.paid_amount || 0;
  const outstandingAmount = totalAmount - paidAmount;
  const taxAmount = invoice.tax_amount || 0;
  const discountAmount = invoice.discount_amount || 0;
  // Calculate subtotal from items (sum of qty * unit_price)
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const paymentTerms = invoice.payment_terms || 'NET 30';
  const notes = invoice.notes || '';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: '20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '3px solid #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <img src="/mmn/mmn.png" alt="MMN Logo" style={{ width: '100px', height: 'auto', objectFit: 'contain' }} />
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{finalCompanyName}</h1>
              <p style={{ fontSize: '11px', margin: '2px 0', color: '#000' }}>{address}</p>
              <p style={{ fontSize: '11px', margin: '2px 0', color: '#000' }}>Phone: {phone}</p>
              <p style={{ fontSize: '11px', margin: '2px 0', color: '#000' }}>Email: {email}</p>
              {company.bank_name && (
                <p style={{ fontSize: '11px', margin: '6px 0 0 0', fontWeight: 'bold', color: '#000' }}>
                  Bank: {company.bank_name} | Rek: {company.bank_account_number} | A/N: {company.bank_account_name}
                </p>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 'bold', margin: '0', color: '#000' }}>INVOICE</h2>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#000' }}>{invoiceNumber}</p>
          </div>
        </div>
      </div>

      {/* Bill To & Invoice Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 8px 0', color: '#000' }}>Bill To:</p>
          <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#000' }}>{customerName}</p>
          <p style={{ fontSize: '11px', margin: '2px 0', whiteSpace: 'pre-wrap', color: '#000' }}>{customerAddress}</p>
          <p style={{ fontSize: '11px', margin: '4px 0 0 0', color: '#000' }}>Phone: {customerPhone}</p>
        </div>
        <div>
          <table style={{ width: '100%', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', paddingBottom: '4px', color: '#000' }}>Invoice Date:</td>
                <td style={{ textAlign: 'right', paddingBottom: '4px', color: '#000' }}>{formatDate(invoiceDate)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', paddingBottom: '4px', color: '#000' }}>Due Date:</td>
                <td style={{ textAlign: 'right', paddingBottom: '4px', color: '#000' }}>{formatDate(dueDate)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', paddingBottom: '4px', color: '#000' }}>Payment Terms:</td>
                <td style={{ textAlign: 'right', paddingBottom: '4px', color: '#000' }}>{paymentTerms}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold', color: '#000' }}>Status:</td>
                <td style={{ textAlign: 'right', color: '#000' }}>{invoice.status?.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table - No Borders */}
      <div style={{ marginBottom: '20px', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold', color: '#000' }}>Description</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', color: '#000', width: '60px' }}>Qty</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#000', width: '100px' }}>Unit Price</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#000', width: '100px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px 4px', fontSize: '11px', color: '#000' }}>{item.product_name || item.description || '-'}</td>
                <td style={{ padding: '8px 4px', textAlign: 'center', fontSize: '11px', color: '#000' }}>{item.quantity}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', fontSize: '11px', color: '#000' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', color: '#000' }}>{formatCurrency(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>



      {/* Full Width Line */}
      <div style={{ borderTop: '2px solid #000', marginBottom: '8px' }}></div>

      {/* Totals & Signature Combined */}
      <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Left: Notes & Signature */}
        <div>
          {notes && (
            <div style={{ marginBottom: '30px' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 6px 0', color: '#000' }}>Notes:</p>
              <p style={{ fontSize: '10px', margin: '0', whiteSpace: 'pre-wrap', color: '#000' }}>{notes}</p>
            </div>
          )}
          <div>
            <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '0 0 40px 0', color: '#000' }}>Approved By</p>
            <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '0', color: '#000' }}>_________________</p>
            <p style={{ fontSize: '9px', margin: '2px 0 0 0', color: '#000' }}>{company.approved_by_name || 'Name'}</p>
            <p style={{ fontSize: '9px', margin: '0', color: '#000' }}>{company.approved_by_position || 'Position'}</p>
          </div>
        </div>

        {/* Right: Totals */}
        <div>
          <table style={{ width: '100%', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '4px', color: '#000' }}>Subtotal:</td>
                <td style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold', color: '#000' }}>{formatCurrency(subtotal)}</td>
              </tr>
              {discountAmount > 0 && (
                <tr>
                  <td style={{ paddingBottom: '4px', color: '#000' }}>Discount:</td>
                  <td style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold', color: '#000' }}>-{formatCurrency(discountAmount)}</td>
                </tr>
              )}
              {taxAmount > 0 && (
                <tr>
                  <td style={{ paddingBottom: '4px', color: '#000' }}>Tax (PPN):</td>
                  <td style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'bold', color: '#000' }}>{formatCurrency(taxAmount)}</td>
                </tr>
              )}
              <tr>
                <td style={{ paddingTop: '6px', paddingBottom: '6px', fontWeight: 'bold', color: '#000' }}>Total:</td>
                <td style={{ textAlign: 'right', paddingTop: '6px', paddingBottom: '6px', fontWeight: 'bold', fontSize: '12px', color: '#000' }}>{formatCurrency(totalAmount)}</td>
              </tr>
              <tr>
                <td style={{ paddingTop: '4px', paddingBottom: '4px', color: '#000' }}>Paid:</td>
                <td style={{ textAlign: 'right', paddingTop: '4px', paddingBottom: '4px', fontWeight: 'bold', color: '#000' }}>{formatCurrency(paidAmount)}</td>
              </tr>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <td style={{ padding: '6px 4px', fontWeight: 'bold', color: '#000' }}>Outstanding:</td>
                <td style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 'bold', fontSize: '12px', color: '#000' }}>{formatCurrency(outstandingAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #ddd', fontSize: '9px', color: '#000' }}>
        <p style={{ margin: '0' }}>Thank you for your business. For inquiries, please contact {email} or {phone}</p>
      </div>
    </div>
  );
}
