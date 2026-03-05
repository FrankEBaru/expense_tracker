import type { Budget, BudgetPeriodType, BudgetPeriodStatus, PeriodBounds } from '../types/budget'
import type { Transaction } from '../types/transaction'

/**
 * Returns the period bounds (start/end as YYYY-MM-DD) that contain the given date.
 * - Weekly: Monday–Sunday (ISO week: Mon = start).
 * - Biweekly: 1–14 and 15–last day of month.
 * - Monthly: 1–last day of month.
 */
export function getPeriodBounds(
  periodType: BudgetPeriodType,
  date: Date
): PeriodBounds {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()

  if (periodType === 'weekly') {
    const dayOfWeek = date.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(date)
    monday.setDate(date.getDate() + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      start: toISODate(monday),
      end: toISODate(sunday),
    }
  }

  if (periodType === 'biweekly') {
    if (d <= 14) {
      return {
        start: `${y}-${pad(m + 1)}-01`,
        end: `${y}-${pad(m + 1)}-14`,
      }
    }
    const lastDay = new Date(y, m + 1, 0).getDate()
    return {
      start: `${y}-${pad(m + 1)}-15`,
      end: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    }
  }

  // monthly
  const lastDay = new Date(y, m + 1, 0).getDate()
  return {
    start: `${y}-${pad(m + 1)}-01`,
    end: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
  }
}

/**
 * Returns the immediately previous period bounds for the given type and date.
 */
export function getPreviousPeriodBounds(
  periodType: BudgetPeriodType,
  date: Date
): PeriodBounds {
  if (periodType === 'weekly') {
    const current = getPeriodBounds('weekly', date)
    const startDate = parseISODate(current.start)
    startDate.setDate(startDate.getDate() - 7)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)
    return { start: toISODate(startDate), end: toISODate(endDate) }
  }

  if (periodType === 'biweekly') {
    const y = date.getFullYear()
    const m = date.getMonth()
    const d = date.getDate()
    if (d <= 14) {
      const lastDayPrev = new Date(y, m, 0).getDate()
      return {
        start: `${y}-${pad(m)}-15`,
        end: `${y}-${pad(m)}-${pad(lastDayPrev)}`,
      }
    }
    return {
      start: `${y}-${pad(m + 1)}-01`,
      end: `${y}-${pad(m + 1)}-14`,
    }
  }

  // monthly
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return getPeriodBounds('monthly', prevMonth)
}

/**
 * Computes budget status for the current period: spent, carried (if cumulative), effective budget, remaining, isOver, overspendCarry.
 */
export function computeBudgetStatus(
  budget: Budget,
  categoryIds: string[],
  transactionsCurrent: Transaction[],
  transactionsPrevious: Transaction[]
): BudgetPeriodStatus {
  const amount = Number(budget.amount)
  const now = new Date()
  const bounds = getPeriodBounds(budget.period_type, now)
  const categorySet = new Set(categoryIds)

  const sumExpenses = (txs: Transaction[]) => {
    let s = 0
    for (const tx of txs) {
      if (tx.type !== 'expense' || !tx.category_id || !categorySet.has(tx.category_id))
        continue
      s += Number(tx.amount)
    }
    return s
  }

  const spent = sumExpenses(transactionsCurrent)
  const spentPrevious = sumExpenses(transactionsPrevious)

  let carried = 0
  let effective = amount
  if (budget.cumulative) {
    carried = Math.max(0, spentPrevious - amount)
    effective = amount - carried
  }

  const remaining = effective - spent
  const isOver = remaining < 0
  const overspendCarry = budget.cumulative ? Math.max(0, -remaining) : 0

  const periodLabel = formatPeriodLabel(budget.period_type, bounds.start, bounds.end)

  return {
    start: bounds.start,
    end: bounds.end,
    spent,
    carried,
    effective,
    remaining,
    isOver,
    overspendCarry,
    periodLabel,
  }
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Returns a date range that covers current and previous periods for all period types.
 * Used to fetch transactions once for budget status computation.
 */
export function getBudgetPeriodsRange(date: Date): PeriodBounds {
  const y = date.getFullYear()
  const m = date.getMonth()
  const start = new Date(y, m - 2, 1)
  const end = new Date(y, m + 1, 0)
  return {
    start: toISODate(start),
    end: toISODate(end),
  }
}

/**
 * Human-readable label for the period (e.g. "Week of Mon 3 Mar – Sun 9 Mar", "1–14 Mar 2025", "March 2025").
 */
export function formatPeriodLabel(
  periodType: BudgetPeriodType,
  start: string,
  end: string
): string {
  const startDate = parseISODate(start)
  const endDate = parseISODate(end)

  if (periodType === 'weekly') {
    const mon = startDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    const sun = endDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    return `Week of ${mon} – ${sun}`
  }

  if (periodType === 'biweekly') {
    const d1 = startDate.getDate()
    const d2 = endDate.getDate()
    const monthYear = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return `${d1}–${d2} ${monthYear}`
  }

  return endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
