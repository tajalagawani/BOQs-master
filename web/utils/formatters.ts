// Format number with commas (e.g., 1,000,000)
export function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null) return '-';
  // Convert to number first (handles Prisma Decimal objects)
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-US');
}

// Format currency with commas and optional symbol
export function formatCurrency(
  value: number | string | undefined | null,
  symbol: string = ''
): string {
  if (value === undefined || value === null) return '-';
  // Convert to number first (handles Prisma Decimal objects)
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return '-';
  const formatted = num.toLocaleString('en-US');
  return symbol ? `${symbol} ${formatted}` : formatted;
}

// Format date to YYYY-MM-DD
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// Format to Quarter Year (e.g., 1Q27, 2Q28)
export function formatQuarterYear(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const quarter = Math.ceil((d.getMonth() + 1) / 3);
  const year = d.getFullYear().toString().slice(-2);
  return `${quarter}Q${year}`;
}

// Format decimal to percentage string
export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return `${value}%`;
}

// Format FAR (Floor Area Ratio)
export function formatFAR(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return value.toFixed(2);
}

// Format area with unit
export function formatArea(value: number | undefined | null, unit: string = 'sqm'): string {
  if (value === undefined || value === null) return '-';
  return `${formatNumber(value)} ${unit}`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
