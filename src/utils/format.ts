/**
 * Format a number as currency (no symbol). Uses en-US locale with 2 decimal places and thousand separators.
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
