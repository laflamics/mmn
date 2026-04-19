import { useState, useEffect } from 'react';

/**
 * NumberInput component with thousand separator formatting
 * Displays: 1,000 but stores: 1000
 */
export default function NumberInput({ 
  value, 
  onChange, 
  placeholder = '0',
  className = '',
  step = '1',
  min,
  max,
  disabled = false,
  allowDecimal = false,
  ...props 
}) {
  const [displayValue, setDisplayValue] = useState('');

  // Format number with thousand separator
  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    
    const numStr = String(num);
    const parts = numStr.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    if (allowDecimal && parts.length > 1) {
      return `${integerPart}.${parts[1]}`;
    }
    
    return integerPart;
  };

  // Parse formatted string to number
  const parseNumber = (str) => {
    if (!str) return '';
    const cleaned = str.replace(/,/g, '');
    return allowDecimal ? cleaned : cleaned.replace(/\./g, '');
  };

  // Update display when value prop changes
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e) => {
    const input = e.target.value;
    
    // Allow empty
    if (input === '') {
      setDisplayValue('');
      onChange('');
      return;
    }

    // Remove all non-numeric except decimal point
    let cleaned = input.replace(/[^\d.]/g, '');
    
    // If not allowing decimal, remove decimal points
    if (!allowDecimal) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      // Only allow one decimal point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    // Apply min/max constraints
    const numValue = parseFloat(cleaned) || 0;
    if (min !== undefined && numValue < min) return;
    if (max !== undefined && numValue > max) return;

    // Format immediately while typing
    const formatted = formatNumber(cleaned);
    setDisplayValue(formatted);
    
    // Send raw number to parent
    onChange(cleaned);
  };

  const handleBlur = () => {
    // Clean up formatting on blur
    if (displayValue) {
      const parsed = parseNumber(displayValue);
      const formatted = formatNumber(parsed);
      setDisplayValue(formatted);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      {...props}
    />
  );
}
