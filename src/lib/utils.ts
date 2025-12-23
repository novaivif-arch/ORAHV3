import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date, format: string = 'DD-MM-YYYY HH:mm'): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (format === 'DD-MM-YYYY HH:mm') {
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  }

  if (format === 'DD-MM-YYYY') {
    return `${day}-${month}-${year}`;
  }

  return `${day}-${month}-${year}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatCurrency(amount: string | number): string {
  if (typeof amount === 'string') return amount;
  return `₹${amount.toLocaleString('en-IN')}`;
}
