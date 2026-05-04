/**
 * Add calendar months to an ISO date string (YYYY-MM-DD), clamping the day
 * when the target month has fewer days (e.g. Jan 31 → Feb 28).
 */
export function addMonthsToDateStr(dateStr: string, deltaMonths: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetMonthStart = new Date(y, m - 1 + deltaMonths, 1)
  const lastDay = new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth() + 1, 0).getDate()
  const day = Math.min(d, lastDay)
  const mm = String(targetMonthStart.getMonth() + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${targetMonthStart.getFullYear()}-${mm}-${dd}`
}

/**
 * Split total financed amount (principal + extra cost) into `months` parts in cents.
 * Last installment absorbs rounding remainder so the sum matches exactly.
 */
export function splitInstallmentAmounts(principal: number, extraCost: number, months: number): number[] {
  if (months < 1 || !Number.isFinite(months)) return [principal + extraCost]
  const total = principal + extraCost
  const totalCents = Math.round(total * 100 + Number.EPSILON)
  const base = Math.floor(totalCents / months)
  const remainder = totalCents - base * months
  const out: number[] = []
  for (let i = 0; i < months; i++) {
    const cents = base + (i === months - 1 ? remainder : 0)
    out.push(cents / 100)
  }
  return out
}
