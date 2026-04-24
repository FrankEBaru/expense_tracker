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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="ui-sheet w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between" style={{ padding: 16, borderBottom: '1px solid var(--border-softer)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-ghost"
            style={{ minHeight: 36, width: 40, padding: 0, textTransform: 'none', letterSpacing: 0 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" style={{ padding: 16 }}>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <div
                className="ui-pill"
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--border-softer)',
                  padding: 6,
                  display: 'flex',
                  gap: 6,
                }}
              >
                {(['expense', 'income', 'transfer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="ui-btn"
                    style={{
                      flex: 1,
                      minHeight: 40,
                      padding: '10px 10px',
                      textTransform: 'none',
                      letterSpacing: 0,
                      background:
                        type === t
                          ? t === 'expense'
                            ? 'rgba(232,52,74,0.12)'
                            : t === 'income'
                              ? 'rgba(61,171,106,0.14)'
                              : 'rgba(123,97,255,0.14)'
                          : 'transparent',
                      border: `1px solid ${type === t ? 'var(--border-soft)' : 'transparent'}`,
                      color: 'var(--text-primary)',
                      borderRadius: 9999,
                      fontWeight: 800,
                    }}
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
                <label htmlFor="fromAccount" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  From account
                </label>
                <select
                  id="fromAccount"
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                  className="ui-select"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="toAccount" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  To account
                </label>
                <select
                  id="toAccount"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="ui-select"
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
                <label htmlFor="account" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Account
                </label>
                <select
                  id="account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                  className="ui-select"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Category
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="ui-select"
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
            <label htmlFor="amount" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
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
              className="ui-input"
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="ui-input"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Description (optional)
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={TRANSACTION_DESCRIPTION_MAX_LENGTH}
              placeholder="e.g. Lunch at café"
              className="ui-input"
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--text-negative)' }}>{error}</p>}
          <div className="flex gap-2 pt-2 safe-bottom">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn ui-btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="ui-btn ui-btn-primary"
              style={{ flex: 1 }}
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
