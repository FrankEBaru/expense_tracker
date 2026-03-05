export type BudgetPeriodType = 'weekly' | 'biweekly' | 'monthly'

export interface Budget {
  id: string
  user_id: string
  name: string
  period_type: BudgetPeriodType
  amount: number
  cumulative: boolean
  sort_order: number
  created_at: string
}

export interface BudgetInsert {
  user_id: string
  name: string
  period_type: BudgetPeriodType
  amount: number
  cumulative?: boolean
  sort_order?: number
}

export interface BudgetUpdate {
  name?: string
  period_type?: BudgetPeriodType
  amount?: number
  cumulative?: boolean
  sort_order?: number
}

export interface BudgetWithCategories extends Budget {
  category_ids: string[]
}

/** Period bounds as ISO date strings (YYYY-MM-DD). */
export interface PeriodBounds {
  start: string
  end: string
}

/** Computed status for one budget in the current (or a given) period. */
export interface BudgetPeriodStatus {
  start: string
  end: string
  spent: number
  carried: number
  effective: number
  remaining: number
  isOver: boolean
  overspendCarry: number
  /** Human-readable period label for UI (e.g. "Week of Mon 3 Mar – Sun 9 Mar"). */
  periodLabel?: string
}
