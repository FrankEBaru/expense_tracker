import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionInsert, TransactionType } from '../types/transaction'
import type { Account } from '../types/account'
import type { Category } from '../types/category'
import { MAX_MONEY_AMOUNT, TRANSACTION_DESCRIPTION_MAX_LENGTH } from '../constants/limits'
import { logInternalError, toUserErrorMessage } from '../utils/errors'

interface TransactionFormProps {
  transaction: Transaction | null
  accounts: Account[]
  expenseCategories: Category[]
  incomeCategories: Category[]
  onClose: () => void
  onSaved: () => void
  onError?: (message: string) => void
  addTransaction: (insert: TransactionInsert) => Promise<void>
  updateTransaction: (
    id: string,
    update: {
      account_id?: string | null
      category_id?: string | null
      from_account_id?: string | null
      to_account_id?: string | null
      amount?: number
      date?: string
      description?: string | null
    }
  ) => Promise<void>
}

export default function TransactionForm({
  transaction,
  accounts,
  expenseCategories,
  incomeCategories,
  onClose,
  onSaved,
  onError,
  addTransaction,
  updateTransaction,
}: TransactionFormProps) {
  const isEdit = !!transaction
  const [type, setType] = useState<TransactionType>('expense')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = type === 'expense' ? expenseCategories : incomeCategories

  useEffect(() => {
    if (isEdit) return
    if (type === 'transfer') {
      setFromAccountId(accounts[0]?.id ?? '')
      setToAccountId(accounts[1]?.id ?? accounts[0]?.id ?? '')
    } else {
      setAccountId(accounts[0]?.id ?? '')
      setCategoryId(categories[0]?.id ?? '')
    }
  }, [type, accounts, categories, isEdit])

  useEffect(() => {
    if (type === 'transfer' || categories.length === 0) return
    const validIds = new Set(categories.map((c) => c.id))
    if (!categoryId || !validIds.has(categoryId)) {
      setCategoryId(categories[0].id)
    }
  }, [type, categories, categoryId])

  useEffect(() => {
    if (transaction) {
      setType(transaction.type)
      setAccountId(transaction.account_id ?? '')
      setCategoryId(transaction.category_id ?? '')
      setFromAccountId(transaction.from_account_id ?? '')
      setToAccountId(transaction.to_account_id ?? '')
      setAmount(String(transaction.amount))
      setDate(transaction.date)
      setDescription(transaction.description ?? '')
    } else {
      setType('expense')
      setAccountId(accounts[0]?.id ?? '')
      setCategoryId(expenseCategories[0]?.id ?? '')
      setFromAccountId(accounts[0]?.id ?? '')
      setToAccountId(accounts[1]?.id ?? accounts[0]?.id ?? '')
      setAmount('')
      setDate(new Date().toISOString().slice(0, 10))
      setDescription('')
    }
  }, [transaction, accounts, expenseCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const num = parseFloat(amount)
    if (!Number.isFinite(num) || num <= 0) {
      setError('Enter a valid amount')
      setSaving(false)
      return
    }
    if (num > MAX_MONEY_AMOUNT) {
      setError('Amount is too large')
      setSaving(false)
      return
    }
    if (description.length > TRANSACTION_DESCRIPTION_MAX_LENGTH) {
      setError(`Description must be ${TRANSACTION_DESCRIPTION_MAX_LENGTH} characters or less`)
      setSaving(false)
      return
    }
    if (type === 'transfer') {
      if (!fromAccountId || !toAccountId) {
        setError('Select from and to accounts')
        setSaving(false)
        return
      }
      if (fromAccountId === toAccountId) {
        setError('From and to accounts must be different')
        setSaving(false)
        return
      }
    } else {
      if (!accountId || !categoryId) {
        setError('Select account and category')
        setSaving(false)
        return
      }
    }
    try {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user) {
        setError('Not logged in')
        setSaving(false)
        return
      }
      if (isEdit && transaction) {
        if (type === 'transfer') {
          await updateTransaction(transaction.id, {
            from_account_id: fromAccountId,
            to_account_id: toAccountId,
            amount: num,
            date,
            description: description || null,
          })
        } else {
          await updateTransaction(transaction.id, {
            account_id: accountId,
            category_id: categoryId,
            amount: num,
            date,
            description: description || null,
          })
        }
      } else {
        if (type === 'transfer') {
          await addTransaction({
            type: 'transfer',
            from_account_id: fromAccountId,
            to_account_id: toAccountId,
            amount: num,
            date,
            description: description || null,
          })
        } else {
          await addTransaction({
            type,
            account_id: accountId,
            category_id: categoryId,
            amount: num,
            date,
            description: description || null,
          })
        }
      }
      onSaved()
    } catch (err) {
      logInternalError('TransactionForm.handleSubmit', err)
      const msg = toUserErrorMessage(err, 'Failed to save')
      setError(msg)
      onError?.(msg)
    } finally {
      setSaving(false)
    }
  }

  const title = isEdit
    ? `Edit ${type}`
    : type === 'transfer'
      ? 'Add transfer'
      : `Add ${type}`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <div className="flex gap-2">
                {(['expense', 'income', 'transfer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize ${
                      type === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'transfer' ? (
            <>
              <div>
                <label htmlFor="fromAccount" className="block text-sm font-medium text-gray-700 mb-1">
                  From account
                </label>
                <select
                  id="fromAccount"
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="toAccount" className="block text-sm font-medium text-gray-700 mb-1">
                  To account
                </label>
                <select
                  id="toAccount"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
                  Account
                </label>
                <select
                  id="account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={MAX_MONEY_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={TRANSACTION_DESCRIPTION_MAX_LENGTH}
              placeholder="e.g. Lunch at café"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
