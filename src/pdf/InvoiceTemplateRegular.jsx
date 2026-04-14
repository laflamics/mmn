import { formatCurrency, formatDate } from '../client/lib/formatters';

export default function InvoiceTemplateRegular({ invoice, items, company = {} }) {
  const {
    name: companyName,
    company_name: companyNameSnake,
    address,
    phone,
    email,
    bank_name,
    bank_account_name,
    bank_account_number,
    approved_by_name
  } = company;

  const finalCompanyName = companyName || companyNameSnake || '';
  const invoiceNumber = invoice.invoice_number || '';
  const customerName = invoice.customers?.name || '';
  const customerAddress = invoice.customers?.address || '';
  const customerPhone = invoice.customers?.phone || '';
  const invoiceDate = invoice.invoice_date || new Date().toISOString();
  const dueDate = invoice.due_date || new Date().toISOString();
  const totalAmount = invoice.total_amount || 0;
  const paidAmount = invoice.paid_amount || 0;
  const outstandingAmount = totalAmount - paidAmount;
  const taxAmount = invoice.tax_amount || 0;
  const discountAmount = invoice.discount_amount || 0;
  const savingAmount = invoice.saving_amount || 0;
  const partialPaymentAmount = invoice.partial_payment_amount || 0;
  
  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  
  const paymentTerms = invoice.payment_terms || '';
  const paymentStatus = invoice.status || '';
  const approvedBy = approved_by_name || '';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000', padding: '30px', minHeight: '100vh', backgroundColor: '#fff' }}>
      {/* Header with Logo and Invoice Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', gap: '20px' }}>
        <div style={{ width: '120px', flexShrink: 0 }}>
          <img src="/mmn/mmn.png" alt="MMN Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', lineHeight: '1.3' }}>{finalCompanyName}</h1>
          {address && <p style={{ fontSize: '10px', margin: '2px 0', color: '#000' }}>{address}</p>}
          {phone && <p style={{ fontSize: '10px', margin: '2px 0', color: '#000' }}>Phone: {phone}</p>}
          {email && <p style={{ fontSize: '10px', margin: '2px 0', color: '#000' }}>Email: {email}</p>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <h2 style={{ fontSize: '48px', fontWeight: 'bold', margin: '0', color: '#0066cc' }}>INVOICE</h2>
        </div>
      </div>

      {/* Invoice Details Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
        {/* Left: Invoice Details */}
        <div>
          <div style={{ backgroundColor: '#666', color: '#fff', padding: '6px 12px', marginBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}>
            INVOICE DETAIL
          </div>
          <table style={{ width: '100%', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '6px', fontWeight: 'bold' }}>INVOICE NO</td>
                <td style={{ paddingBottom: '6px' }}>:</td>
                <td style={{ paddingBottom: '6px', textAlign: 'right' }}>{invoiceNumber}</td>
              </tr>
              <tr>
                <td style={{ paddingBottom: '6px', fontWeight: 'bold' }}>INVOICE DATE</td>
                <td style={{ paddingBottom: '6px' }}>:</td>
                <td style={{ paddingBottom: '6px', textAlign: 'right' }}>{formatDate(invoiceDate)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 'bold' }}>DUE DATE</td>
                <td>:</td>
                <td style={{ textAlign: 'right' }}>{formatDate(dueDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: Bill To */}
        <div>
          <div style={{ backgroundColor: '#666', color: '#fff', padding: '6px 12px', marginBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}>
            INVOICE TO
          </div>
          <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{customerName}</p>
          <p style={{ fontSize: '11px', margin: '0 0 4px 0', whiteSpace: 'pre-wrap' }}>{customerAddress}</p>
          <p style={{ fontSize: '11px', margin: '0' }}>({customerPhone})</p>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#b3d9ff', borderBottom: '2px solid #0066cc' }}>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold', width: '5%' }}>NO</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold', width: '10%' }}>SKU</th>
              <th style={{ padding: '8px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold' }}>ITEM DESCRIPTION</th>
              <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', width: '10%' }}>QTY(Sak)</th>
              <th style={{ padding: '8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', width: '10%' }}>TONASE(Kg)</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', width: '12%' }}>UNIT PRICE(Rp)</th>
              <th style={{ padding: '8px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', width: '12%' }}>PRICE(Rp)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd', backgroundColor: idx % 2 === 0 ? '#f9f9f9' : '#fff' }}>
                <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}>{idx + 1}</td>
                <td style={{ padding: '8px', fontSize: '11px' }}>{item.sku || '-'}</td>
                <td style={{ padding: '8px', fontSize: '11px' }}>{item.product_name || item.description || '-'}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}>{item.quantity}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px' }}>{item.tonase || '-'}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold' }}>{formatCurrency(item.quantity * item.unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Section: Payment Info & Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '30px' }}>
        {/* Left: Payment Method & Status */}
        <div>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Payment Method:</p>
            <p style={{ fontSize: '11px', margin: '0', color: '#0066cc', fontWeight: 'bold' }}>{paymentTerms || '-'}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Payment Status:</p>
            <p style={{ fontSize: '11px', margin: '0', color: '#0066cc', fontWeight: 'bold' }}>{paymentStatus || '-'}</p>
          </div>
          {(bank_name || bank_account_name || bank_account_number) && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Bank Information</p>
              {bank_name && <p style={{ fontSize: '10px', margin: '2px 0' }}>Bank Name : {bank_name}</p>}
              {bank_account_name && <p style={{ fontSize: '10px', margin: '2px 0' }}>Acc. Name : {bank_account_name}</p>}
              {bank_account_number && <p style={{ fontSize: '10px', margin: '2px 0' }}>Acc. No : {bank_account_number}</p>}
            </div>
          )}
        </div>

        {/* Right: Totals */}
        <div>
          <table style={{ width: '100%', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ paddingBottom: '6px', textAlign: 'right' }}>SUB TOTAL</td>
                <td style={{ paddingBottom: '6px', textAlign: 'right', fontWeight: 'bold', paddingLeft: '20px' }}>{formatCurrency(subtotal)}</td>
              </tr>
              {taxAmount > 0 && (
                <tr>
                  <td style={{ paddingBottom: '6px', textAlign: 'right' }}>TAX</td>
                  <td style={{ paddingBottom: '6px', textAlign: 'right', fontWeight: 'bold', paddingLeft: '20px' }}>{formatCurrency(taxAmount)}</td>
                </tr>
              )}
              {savingAmount > 0 && (
                <tr>
                  <td style={{ paddingBottom: '6px', textAlign: 'right' }}>SAVING</td>
                  <td style={{ paddingBottom: '6px', textAlign: 'right', fontWeight: 'bold', paddingLeft: '20px' }}>{formatCurrency(savingAmount)}</td>
                </tr>
              )}
              {discountAmount > 0 && (
                <tr>
                  <td style={{ paddingBottom: '6px', textAlign: 'right' }}>DISCOUNT</td>
                  <td style={{ paddingBottom: '6px', textAlign: 'right', fontWeight: 'bold', paddingLeft: '20px' }}>-{formatCurrency(discountAmount)}</td>
                </tr>
              )}
              {partialPaymentAmount > 0 && (
                <tr>
                  <td style={{ paddingBottom: '6px', textAlign: 'right' }}>PARTIAL PAYMENT</td>
                  <td style={{ paddingBottom: '6px', textAlign: 'right', fontWeight: 'bold', paddingLeft: '20px' }}>{formatCurrency(partialPaymentAmount)}</td>
                </tr>
              )}
              <tr style={{ backgroundColor: '#666', color: '#fff' }}>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>GRAND TOTAL</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px', paddingLeft: '20px' }}>{formatCurrency(subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature Section */}
      <div style={{ marginTop: '40px', textAlign: 'right' }}>
        <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 50px 0' }}>Approved By</p>
        {approvedBy && <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0' }}>{approvedBy}</p>}
      </div>
    </div>
  );
}
