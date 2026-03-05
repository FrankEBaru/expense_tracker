import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type {
  Budget,
  BudgetInsert,
  BudgetUpdate,
  BudgetWithCategories,
} from '../types/budget'
import { logInternalError, toUserErrorMessage } from '../utils/errors'

interface BudgetCategoryRow {
  budget_id: string
  category_id: string
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetWithCategories[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user?.id
    if (!userId) {
      setBudgets([])
      setLoading(false)
      return
    }
    const { data: budgetsData, error: e1 } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (e1) {
      logInternalError('useBudgets.fetchBudgets.budgets', e1)
      setError(toUserErrorMessage(e1, 'Could not load budgets.'))
      setBudgets([])
      setLoading(false)
      return
    }
    const budgetsList = (budgetsData as Budget[]) ?? []
    const budgetIds = budgetsList.map((budget) => budget.id)
    if (budgetIds.length === 0) {
      setBudgets([])
      setLoading(false)
      return
    }
    const { data: linksData, error: e2 } = await supabase
      .from('budget_categories')
      .select('budget_id, category_id')
      .in('budget_id', budgetIds)
    if (e2) {
      logInternalError('useBudgets.fetchBudgets.budgetCategories', e2)
      setError(toUserErrorMessage(e2, 'Could not load budget categories.'))
      setBudgets([])
      setLoading(false)
      return
    }
    const links = (linksData as BudgetCategoryRow[]) ?? []
    const categoryIdsByBudget = new Map<string, string[]>()
    for (const row of links) {
      const list = categoryIdsByBudget.get(row.budget_id) ?? []
      list.push(row.category_id)
      categoryIdsByBudget.set(row.budget_id, list)
    }
    const withCategories: BudgetWithCategories[] = budgetsList.map((b) => ({
      ...b,
      category_ids: categoryIdsByBudget.get(b.id) ?? [],
    }))
    setBudgets(withCategories)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const addBudget = useCallback(
    async (insert: BudgetInsert): Promise<string> => {
      const { data, error: e } = await supabase
        .from('budgets')
        .insert({
          ...insert,
          cumulative: insert.cumulative ?? false,
          sort_order: insert.sort_order ?? 0,
        })
        .select('id')
        .single()
      if (e) throw e
      const id = (data as { id: string }).id
      await fetchBudgets()
      return id
    },
    [fetchBudgets]
  )

  const updateBudget = useCallback(
    async (id: string, update: BudgetUpdate) => {
      const { error: e } = await supabase.from('budgets').update(update).eq('id', id)
      if (e) throw e
      await fetchBudgets()
    },
    [fetchBudgets]
  )

  const deleteBudget = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from('budgets').delete().eq('id', id)
      if (e) throw e
      await fetchBudgets()
    },
    [fetchBudgets]
  )

  const setBudgetCategories = useCallback(
    async (budgetId: string, categoryIds: string[]) => {
      const { error: e1 } = await supabase
        .from('budget_categories')
        .delete()
        .eq('budget_id', budgetId)
      if (e1) throw e1
      if (categoryIds.length > 0) {
        const rows = categoryIds.map((category_id) => ({ budget_id: budgetId, category_id }))
        const { error: e2 } = await supabase.from('budget_categories').insert(rows)
        if (e2) throw e2
      }
      await fetchBudgets()
    },
    [fetchBudgets]
  )

  return {
    budgets,
    loading,
    error,
    addBudget,
    updateBudget,
    deleteBudget,
    setBudgetCategories,
    refetch: fetchBudgets,
  }
}
