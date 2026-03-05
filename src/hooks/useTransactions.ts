import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionInsert, TransactionUpdate } from '../types/transaction'
import { logInternalError, toUserErrorMessage } from '../utils/errors'
import { isUuid } from '../utils/validation'

function getMonthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function useTransactions(selectedMonth: string, accountId: string | null = null) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { start, end } = getMonthBounds(selectedMonth)
    let query = supabase
      .from('transactions')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (accountId) {
      if (!isUuid(accountId)) {
        setError('Invalid account filter.')
        setTransactions([])
        setLoading(false)
        return
      }
      query = query.or(`account_id.eq.${accountId},from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
    }

    const { data, error: e } = await query

    if (e) {
      logInternalError('useTransactions.fetchTransactions', e)
      setError(toUserErrorMessage(e, 'Could not load transactions.'))
      setTransactions([])
    } else {
      setTransactions((data ?? []) as Transaction[])
    }
    setLoading(false)
  }, [selectedMonth, accountId])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = useCallback(
    async (insert: TransactionInsert) => {
      const { error: e } = await supabase.from('transactions').insert(insert)
      if (e) throw e
      await fetchTransactions()
    },
    [fetchTransactions]
  )

  const updateTransaction = useCallback(
    async (id: string, update: TransactionUpdate) => {
      const { error: e } = await supabase.from('transactions').update(update).eq('id', id)
      if (e) throw e
      await fetchTransactions()
    },
    [fetchTransactions]
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from('transactions').delete().eq('id', id)
      if (e) throw e
      await fetchTransactions()
    },
    [fetchTransactions]
  )

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  }
}
