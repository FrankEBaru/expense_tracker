import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { CATEGORY_PALETTE } from '../constants/colors'
import type { Account } from '../types/account'

interface SettingsProps {
  onBack: () => void
  onError?: (message: string) => void
}

export default function Settings({ onBack, onError }: SettingsProps) {
  const { accounts, loading: accountsLoading, addAccount, updateAccount, deleteAccount } = useAccounts()
  const {
    categories: expenseCategories,
    addCategory: addExpenseCategory,
    updateCategory: updateExpenseCategory,
    deleteCategory: deleteExpenseCategory,
  } = useCategories('expense')
  const {
    categories: incomeCategories,
    addCategory: addIncomeCategory,
    updateCategory: updateIncomeCategory,
    deleteCategory: deleteIncomeCategory,
  } = useCategories('income')

  const [accountForm, setAccountForm] = useState<Account | null | 'new'>(null)
  const [accountName, setAccountName] = useState('')
  const [accountInitialBalance, setAccountInitialBalance] = useState('0')
  const [expenseCategoryName, setExpenseCategoryName] = useState('')
  const [incomeCategoryName, setIncomeCategoryName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openAccountMenuId, setOpenAccountMenuId] = useState<string | null>(null)
  const [openColorCategoryId, setOpenColorCategoryId] = useState<string | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (openAccountMenuId === null) return
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setOpenAccountMenuId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openAccountMenuId])

  const openNewAccount = () => {
    setAccountForm('new')
    setAccountName('')
    setAccountInitialBalance('0')
    setError(null)
  }

  const openEditAccount = (acc: Account) => {
    setAccountForm(acc)
    setAccountName(acc.name)
    setAccountInitialBalance(String(acc.initial_balance))
    setError(null)
  }

  const closeAccountForm = () => setAccountForm(null)

  const handleSaveAccount = async () => {
    setError(null)
    setSaving(true)
    const num = parseFloat(accountInitialBalance)
    if (Number.isNaN(num)) {
      setError('Enter a valid initial balance')
      setSaving(false)
      return
    }
    if (!accountName.trim()) {
      setError('Enter a name')
      setSaving(false)
      return
    }
    try {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) {
        setError('Not logged in')
        setSaving(false)
        return
      }
      if (accountForm === 'new') {
        await addAccount({ user_id: session.user.id, name: accountName.trim(), initial_balance: num })
      } else if (accountForm) {
        await updateAccount(accountForm.id, { name: accountName.trim(), initial_balance: num })
      }
      closeAccountForm()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      setError(msg)
      onError?.(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    const { data } = await supabase
      .from('transactions')
      .select('id')
      .or(`account_id.eq.${id},from_account_id.eq.${id},to_account_id.eq.${id}`)
      .limit(1)
    if (data && data.length > 0) {
      window.alert('Cannot delete: this account has transactions.')
      return
    }
    if (!window.confirm('Delete this account?')) return
    try {
      await deleteAccount(id)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not delete account.')
    }
  }

  const handleAddExpenseCategory = async () => {
    if (!expenseCategoryName.trim()) return
    setError(null)
    try {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) return
      await addExpenseCategory({ user_id: session.user.id, type: 'expense', name: expenseCategoryName.trim() })
      setExpenseCategoryName('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add category'
      setError(msg)
      onError?.(msg)
    }
  }

  const handleAddIncomeCategory = async () => {
    if (!incomeCategoryName.trim()) return
    setError(null)
    try {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) return
      await addIncomeCategory({ user_id: session.user.id, type: 'income', name: incomeCategoryName.trim() })
      setIncomeCategoryName('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add category'
      setError(msg)
      onError?.(msg)
    }
  }

  const handleDeleteExpenseCategory = async (id: string) => {
    const { data } = await supabase.from('transactions').select('id').eq('category_id', id)
    const count = data?.length ?? 0
    if (count > 0) {
      window.alert(`Cannot delete: ${count} transaction${count === 1 ? '' : 's'} ${count === 1 ? 'uses' : 'use'} this category. Change them to another category first.`)
      return
    }
    if (!window.confirm('Delete this category?')) return
    try {
      await deleteExpenseCategory(id)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not delete category.')
    }
  }

  const handleDeleteIncomeCategory = async (id: string) => {
    const { data } = await supabase.from('transactions').select('id').eq('category_id', id)
    const count = data?.length ?? 0
    if (count > 0) {
      window.alert(`Cannot delete: ${count} transaction${count === 1 ? '' : 's'} ${count === 1 ? 'uses' : 'use'} this category. Change them to another category first.`)
      return
    }
    if (!window.confirm('Delete this category?')) return
    try {
      await deleteIncomeCategory(id)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not delete category.')
    }
  }

  const handleToggleHideBalance = async (acc: Account) => {
    try {
      await updateAccount(acc.id, { hide_balance: !acc.hide_balance })
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not update account.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
        <span className="w-12" />
      </div>

      <section>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accounts</h3>
        {accountsLoading ? (
          <p className="text-gray-500 text-sm dark:text-gray-400">Loading…</p>
        ) : accounts.length === 0 ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No accounts yet. Add one below.</p>
            <button
              type="button"
              onClick={openNewAccount}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              + Add account
            </button>
          </>
        ) : (
          <>
            <ul className="space-y-2 mb-3">
              {accounts.map((acc) => (
                <li
                  key={acc.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap"
                >
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{acc.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      Initial: ${Number(acc.initial_balance).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!acc.hide_balance}
                        onChange={() => void handleToggleHideBalance(acc)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Hide balance
                    </label>
                    <div className="relative shrink-0" ref={openAccountMenuId === acc.id ? accountMenuRef : undefined}>
                      <button
                        type="button"
                        onClick={() => setOpenAccountMenuId(openAccountMenuId === acc.id ? null : acc.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                        aria-label="Actions"
                        aria-expanded={openAccountMenuId === acc.id}
                      >
                        ⋮
                      </button>
                      {openAccountMenuId === acc.id && (
                        <div className="absolute right-0 top-full mt-1 z-20 min-w-[7rem] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              openEditAccount(acc)
                              setOpenAccountMenuId(null)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteAccount(acc.id)
                              setOpenAccountMenuId(null)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={openNewAccount}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add account
            </button>
          </>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expense categories</h3>
        {expenseCategories.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No expense categories yet. Add one below.</p>
        ) : null}
        <ul className="space-y-2 mb-3">
          {expenseCategories.map((c) => (
            <li
              key={c.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex items-center justify-between gap-2"
            >
              <span className="text-gray-800 dark:text-gray-200 min-w-0 truncate">{c.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenColorCategoryId((id) => (id === c.id ? null : c.id))}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-500 shadow-inner"
                    style={{ backgroundColor: c.color ?? CATEGORY_PALETTE[0] }}
                    title={openColorCategoryId === c.id ? 'Hide color picker' : 'Change color'}
                  />
                  {openColorCategoryId === c.id && (
                    <div className="flex items-center gap-1">
                      {CATEGORY_PALETTE.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          title={hex}
                          onClick={() => {
                            updateExpenseCategory(c.id, { color: hex })
                            setOpenColorCategoryId(null)
                          }}
                          className={`w-5 h-5 rounded-full border-2 transition ${c.color === hex ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent hover:border-gray-400'}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteExpenseCategory(c.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm shrink-0"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={expenseCategoryName}
            onChange={(e) => setExpenseCategoryName(e.target.value)}
            placeholder="New category name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            type="button"
            onClick={handleAddExpenseCategory}
            className="py-2 px-4 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Income categories</h3>
        {incomeCategories.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No income categories yet. Add one below.</p>
        ) : null}
        <ul className="space-y-2 mb-3">
          {incomeCategories.map((c) => (
            <li
              key={c.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex items-center justify-between gap-2"
            >
              <span className="text-gray-800 dark:text-gray-200 min-w-0 truncate">{c.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOpenColorCategoryId((id) => (id === c.id ? null : c.id))}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-500 shadow-inner"
                    style={{ backgroundColor: c.color ?? CATEGORY_PALETTE[0] }}
                    title={openColorCategoryId === c.id ? 'Hide color picker' : 'Change color'}
                  />
                  {openColorCategoryId === c.id && (
                    <div className="flex items-center gap-1">
                      {CATEGORY_PALETTE.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          title={hex}
                          onClick={() => {
                            updateIncomeCategory(c.id, { color: hex })
                            setOpenColorCategoryId(null)
                          }}
                          className={`w-5 h-5 rounded-full border-2 transition ${c.color === hex ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent hover:border-gray-400'}`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteIncomeCategory(c.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm shrink-0"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={incomeCategoryName}
            onChange={(e) => setIncomeCategoryName(e.target.value)}
            placeholder="New category name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            type="button"
            onClick={handleAddIncomeCategory}
            className="py-2 px-4 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Add
          </button>
        </div>
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {accountForm && (
        <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {accountForm === 'new' ? 'Add account' : 'Edit account'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                  placeholder="e.g. Checking"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={accountInitialBalance}
                  onChange={(e) => setAccountInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeAccountForm}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
