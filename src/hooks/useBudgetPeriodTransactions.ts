import { useMemo, useCallback, useRef } from 'react'
import { useTransactionsRange } from './useTransactionsRange'
import {
  getPeriodBounds,
  getPreviousPeriodBounds,
  getBudgetPeriodsRange,
} from '../utils/budgetPeriods'
import type { BudgetPeriodType } from '../types/budget'
import type { Transaction } from '../types/transaction'

/**
 * Returns transactions for budget status: fetches a range covering current and previous
 * periods for all period types, then exposes getTransactionsForPeriod(periodType, which).
 * Uses a stable "today" per mount so the range does not change every render.
 */
export function useBudgetPeriodTransactions(asOf?: Date) {
  const asOfRef = useRef(asOf ?? new Date())
  const asOfDate = asOf ?? asOfRef.current
  const range = useMemo(() => getBudgetPeriodsRange(asOfDate), [asOfDate])
  const { transactions, loading, error, refetch } = useTransactionsRange(range.start, range.end)

  const getTransactionsForPeriod = useCallback(
    (periodType: BudgetPeriodType, which: 'current' | 'previous'): Transaction[] => {
      const bounds =
        which === 'current'
          ? getPeriodBounds(periodType, asOfDate)
          : getPreviousPeriodBounds(periodType, asOfDate)
      return transactions.filter((tx) => tx.date >= bounds.start && tx.date <= bounds.end)
    },
    [transactions, asOfDate]
  )

  return {
    getTransactionsForPeriod,
    transactions,
    loading,
    error,
    refetch,
  }
}
