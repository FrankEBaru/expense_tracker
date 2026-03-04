/** Predefined palette for category colors (works in light and dark theme). Stored as hex. */
export const CATEGORY_PALETTE = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#d946ef', // fuchsia
] as const

export function getCategoryColor(
  categoryId: string,
  categories: { id: string; color?: string | null }[],
  fallbackIndex: number
): string {
  const cat = categories.find((c) => c.id === categoryId)
  if (cat?.color) return cat.color
  return CATEGORY_PALETTE[fallbackIndex % CATEGORY_PALETTE.length]
}
