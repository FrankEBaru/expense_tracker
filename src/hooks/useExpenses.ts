import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense, ExpenseInsert, ExpenseUpdate } from '../types/expense'

function getMonthBounds(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function useExpenses(selectedMonth: string) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { start, end } = getMonthBounds(selectedMonth)
    const { data, error: e } = await supabase
      .from('expenses')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
    if (e) {
      setError(e.message)
      setExpenses([])
    } else {
      setExpenses((data as Expense[]) ?? [])
    }
    setLoading(false)
  }, [selectedMonth])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const addExpense = useCallback(
    async (insert: ExpenseInsert) => {
      const { error: e } = await supabase.from('expenses').insert(insert)
      if (e) throw e
      await fetchExpenses()
    },
    [fetchExpenses]
  )

  const updateExpense = useCallback(
    async (id: string, update: ExpenseUpdate) => {
      const { error: e } = await supabase.from('expenses').update(update).eq('id', id)
      if (e) throw e
      await fetchExpenses()
    },
    [fetchExpenses]
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from('expenses').delete().eq('id', id)
      if (e) throw e
      await fetchExpenses()
    },
    [fetchExpenses]
  )

  return { expenses, loading, error, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses }
}
