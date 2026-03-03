import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import type { Account } from '../types/account'

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const { accounts, loading: accountsLoading, addAccount, updateAccount, deleteAccount } = useAccounts()
  const {
    categories: expenseCategories,
    addCategory: addExpenseCategory,
    deleteCategory: deleteExpenseCategory,
  } = useCategories('expense')
  const {
    categories: incomeCategories,
    addCategory: addIncomeCategory,
    deleteCategory: deleteIncomeCategory,
  } = useCategories('income')

  const [accountForm, setAccountForm] = useState<Account | null | 'new'>(null)
  const [accountName, setAccountName] = useState('')
  const [accountInitialBalance, setAccountInitialBalance] = useState('0')
  const [expenseCategoryName, setExpenseCategoryName] = useState('')
  const [incomeCategoryName, setIncomeCategoryName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setError(err instanceof Error ? err.message : 'Failed to save')
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
    await deleteAccount(id)
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
      setError(err instanceof Error ? err.message : 'Failed to add category')
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
      setError(err instanceof Error ? err.message : 'Failed to add category')
    }
  }

  const handleDeleteExpenseCategory = async (id: string) => {
    const { data } = await supabase.from('transactions').select('id').eq('category_id', id).limit(1)
    if (data && data.length > 0) {
      window.alert('Cannot delete: this category is in use.')
      return
    }
    if (!window.confirm('Delete this category?')) return
    await deleteExpenseCategory(id)
  }

  const handleDeleteIncomeCategory = async (id: string) => {
    const { data } = await supabase.from('transactions').select('id').eq('category_id', id).limit(1)
    if (data && data.length > 0) {
      window.alert('Cannot delete: this category is in use.')
      return
    }
    if (!window.confirm('Delete this category?')) return
    await deleteIncomeCategory(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
        <span className="w-12" />
      </div>

      <section>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Accounts</h3>
        {accountsLoading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : (
          <>
            <ul className="space-y-2 mb-3">
              {accounts.map((acc) => (
                <li
                  key={acc.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-gray-800">{acc.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      Initial: ${Number(acc.initial_balance).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditAccount(acc)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded text-sm"
                    >
                      Delete
                    </button>
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
        <h3 className="text-sm font-medium text-gray-700 mb-2">Expense categories</h3>
        <ul className="space-y-2 mb-3">
          {expenseCategories.map((c) => (
            <li
              key={c.id}
              className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
            >
              <span className="text-gray-800">{c.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteExpenseCategory(c.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded text-sm"
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
        <h3 className="text-sm font-medium text-gray-700 mb-2">Income categories</h3>
        <ul className="space-y-2 mb-3">
          {incomeCategories.map((c) => (
            <li
              key={c.id}
              className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
            >
              <span className="text-gray-800">{c.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteIncomeCategory(c.id)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded text-sm"
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      {accountForm && (
        <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {accountForm === 'new' ? 'Add account' : 'Edit account'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Checking"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={accountInitialBalance}
                  onChange={(e) => setAccountInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeAccountForm}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700"
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
