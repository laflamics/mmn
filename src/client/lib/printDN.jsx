import { createRoot } from 'react-dom/client';
import DNTemplate from '../../pdf/DNTemplate';

export const printDeliveryNote = async (deliveryNote, items, company = {}) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow pop-ups to print the Delivery Note');
    return;
  }

  // Create a temporary container
  const container = document.createElement('div');
  const root = createRoot(container);

  // Render the template
  root.render(
    <DNTemplate 
      deliveryNote={deliveryNote} 
      items={items}
      company={company}
    />
  );

  // Wait for rendering
  setTimeout(() => {
    const html = container.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Surat Jalan - ${deliveryNote.dn_number}</title>
          <script src="https://cdn.tailwindcss.com"><\/script>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          <\/script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }, 100);
};

export const downloadDeliveryNotePDF = async (deliveryNote, items, company = {}) => {
  // This requires html2pdf library
  // For now, we'll use the print function
  // In production, integrate with a PDF library like jsPDF or html2pdf
  printDeliveryNote(deliveryNote, items, company);
};
