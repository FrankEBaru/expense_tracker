import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Account, AccountInsert, AccountUpdate, AccountWithBalance } from '../types/account'
import type { Transaction } from '../types/transaction'

function computeBalances(
  accounts: Account[],
  transactions: Transaction[]
): AccountWithBalance[] {
  return accounts.map((acc) => {
    let balance = Number(acc.initial_balance)
    for (const t of transactions) {
      if (t.type === 'income' && t.account_id === acc.id) balance += Number(t.amount)
      if (t.type === 'expense' && t.account_id === acc.id) balance -= Number(t.amount)
      if (t.type === 'transfer') {
        if (t.to_account_id === acc.id) balance += Number(t.amount)
        if (t.from_account_id === acc.id) balance -= Number(t.amount)
      }
    }
    return { ...acc, balance }
  })
}

const DEFAULT_EXPENSE_CATEGORIES = ['Food', 'Transport', 'Bills', 'Shopping', 'Other']
const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Freelance', 'Other']

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(null)
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user?.id
    if (!userId) {
      setAccounts([])
      if (!quiet) setLoading(false)
      return
    }
    const { data: accountsData, error: e1 } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true })
    if (e1) {
      setError(e1.message)
      setAccounts([])
      if (!quiet) setLoading(false)
      return
    }
    const accountsList = (accountsData as Account[]) ?? []
    if (accountsList.length === 0) {
      const { error: insErr } = await supabase.from('accounts').insert({
        user_id: userId,
        name: 'Default',
        initial_balance: 0,
      })
      if (insErr) {
        setError(insErr.message)
        if (!quiet) setLoading(false)
        return
      }
      for (const name of DEFAULT_EXPENSE_CATEGORIES) {
        await supabase.from('categories').insert({ user_id: userId, type: 'expense', name, sort_order: 0 })
      }
      for (const name of DEFAULT_INCOME_CATEGORIES) {
        await supabase.from('categories').insert({ user_id: userId, type: 'income', name, sort_order: 0 })
      }
      return fetchAccounts(quiet)
    }
    const { data: txData, error: e2 } = await supabase
      .from('transactions')
      .select('id, type, account_id, from_account_id, to_account_id, amount')
    if (e2) {
      setError(e2.message)
      setAccounts(accountsList.map((a) => ({ ...a, balance: Number(a.initial_balance) })))
      if (!quiet) setLoading(false)
      return
    }
    const transactions = (txData as Transaction[]) ?? []
    setAccounts(computeBalances(accountsList, transactions))
    if (!quiet) setLoading(false)
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const addAccount = useCallback(
    async (insert: AccountInsert) => {
      const { error: e } = await supabase.from('accounts').insert(insert)
      if (e) throw e
      await fetchAccounts(true)
    },
    [fetchAccounts]
  )

  const updateAccount = useCallback(
    async (id: string, update: AccountUpdate) => {
      const { error: e } = await supabase.from('accounts').update(update).eq('id', id)
      if (e) throw e
      await fetchAccounts(true)
    },
    [fetchAccounts]
  )

  const deleteAccount = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from('accounts').delete().eq('id', id)
      if (e) throw e
      await fetchAccounts(true)
    },
    [fetchAccounts]
  )

  return {
    accounts,
    loading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    refetch: fetchAccounts,
  }
}
