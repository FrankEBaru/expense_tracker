/** Predefined palettes (hex). Stored as hex in DB. */

/** Cooler/neutral palette for accounts. */
export const ACCOUNT_PALETTE = [
  '#64748b', // slate
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#475569', // slate-600
  '#0ea5e9', // sky
  '#8b5cf6', // violet
] as const

/** Warm palette for expense categories. */
export const EXPENSE_CATEGORY_PALETTE = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#f97316', // orange
  '#f43f5e', // rose
  '#eab308', // yellow
  '#dc2626', // red-600
] as const

/** Greens/teals for income categories. */
export const INCOME_CATEGORY_PALETTE = [
  '#10b981', // emerald
  '#14b8a6', // teal
  '#22c55e', // green
  '#059669', // emerald-600
  '#0d9488', // teal-600
  '#84cc16', // lime
] as const

/** @deprecated Use EXPENSE_CATEGORY_PALETTE or INCOME_CATEGORY_PALETTE. Kept for backward compatibility. */
export const CATEGORY_PALETTE = EXPENSE_CATEGORY_PALETTE

export type ColorPalette = readonly string[]

export function getCategoryColor(
  categoryId: string,
  categories: { id: string; color?: string | null }[],
  fallbackIndex: number,
  palette: ColorPalette = EXPENSE_CATEGORY_PALETTE
): string {
  const cat = categories.find((c) => c.id === categoryId)
  if (cat?.color) return cat.color
  return palette[fallbackIndex % palette.length]
}

export function getAccountColor(
  account: { color?: string | null },
  fallbackIndex: number
): string {
  if (account?.color) return account.color
  return ACCOUNT_PALETTE[fallbackIndex % ACCOUNT_PALETTE.length]
}
