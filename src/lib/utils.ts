import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats currency for "at a glance" summary views.
 * Abbreviates thousands (k) and lakhs (L) for large amounts.
 * Standardizes commas and removes trailing .00 for smaller amounts.
 */
export function formatAmount(amount: number): string {
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 100000) {
    return (amount / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  }
  
  if (absAmount >= 10000) {
    return (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }

  // Use Indian numbering system for standard formatting
  return amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}
