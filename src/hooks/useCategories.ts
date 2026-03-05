import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, CategoryInsert, CategoryUpdate } from '../types/category'
import type { CategoryType } from '../types/category'
import { logInternalError, toUserErrorMessage } from '../utils/errors'

export function useCategories(type: CategoryType) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (e) {
      logInternalError('useCategories.fetchCategories', e)
      setError(toUserErrorMessage(e, 'Could not load categories.'))
      setCategories([])
    } else {
      setCategories((data as Category[]) ?? [])
    }
    setLoading(false)
  }, [type])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addCategory = useCallback(
    async (insert: CategoryInsert) => {
      const { error: e } = await supabase.from('categories').insert({ ...insert, type })
      if (e) throw e
      await fetchCategories()
    },
    [type, fetchCategories]
  )

  const updateCategory = useCallback(
    async (id: string, update: CategoryUpdate) => {
      const { error: e } = await supabase.from('categories').update(update).eq('id', id)
      if (e) throw e
      await fetchCategories()
    },
    [fetchCategories]
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from('categories').delete().eq('id', id)
      if (e) throw e
      await fetchCategories()
    },
    [fetchCategories]
  )

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  }
}
