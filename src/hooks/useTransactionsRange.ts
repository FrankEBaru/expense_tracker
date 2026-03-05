import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types/transaction'
import { logInternalError, toUserErrorMessage } from '../utils/errors'

export function useTransactionsRange(startDate: string, endDate: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })

    if (e) {
      logInternalError('useTransactionsRange.fetchTransactions', e)
      setError(toUserErrorMessage(e, 'Could not load transactions.'))
      setTransactions([])
    } else {
      setTransactions((data ?? []) as Transaction[])
    }
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  }
}
