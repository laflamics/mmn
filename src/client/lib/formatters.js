// Format currency to Indonesian Rupiah (Rp)
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'Rp 0';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

// Format date to dd/mm/yyyy in Jakarta timezone
export const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  try {
    const date = new Date(dateValue);
    // Convert to Jakarta timezone (UTC+7)
    const jakartaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const day = String(jakartaDate.getDate()).padStart(2, '0');
    const month = String(jakartaDate.getMonth() + 1).padStart(2, '0');
    const year = jakartaDate.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '-';
  }
};

// Format date and time to dd/mm/yyyy HH:mm in Jakarta timezone
export const formatDateTime = (dateValue) => {
  if (!dateValue) return '-';
  try {
    const date = new Date(dateValue);
    const jakartaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const day = String(jakartaDate.getDate()).padStart(2, '0');
    const month = String(jakartaDate.getMonth() + 1).padStart(2, '0');
    const year = jakartaDate.getFullYear();
    const hours = String(jakartaDate.getHours()).padStart(2, '0');
    const minutes = String(jakartaDate.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return '-';
  }
};

// Get current date in Jakarta timezone as ISO string
export const getCurrentJakartaDate = () => {
  const now = new Date();
  const jakartaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return jakartaDate.toISOString();
};

// Format number with 2 decimal places
export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0.00';
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};
