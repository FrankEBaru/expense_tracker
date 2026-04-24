import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { formatCurrency } from '../utils/format'
import { ACCOUNT_PALETTE, EXPENSE_CATEGORY_PALETTE, INCOME_CATEGORY_PALETTE, getAccountColor } from '../constants/colors'
import { ACCOUNT_NAME_MAX_LENGTH, CATEGORY_NAME_MAX_LENGTH, MAX_MONEY_AMOUNT } from '../constants/limits'
import type { Account } from '../types/account'
import type { Category } from '../types/category'
import { logInternalError, toUserErrorMessage } from '../utils/errors'
import { isHexColor, isUuid } from '../utils/validation'
import { IconMoon, IconSun } from './ui/icons'

interface SettingsProps {
  onBack: () => void
  onError?: (message: string) => void
  dark: boolean
  onToggleTheme: () => void
}

export default function Settings({ onBack, onError, dark, onToggleTheme }: SettingsProps) {
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
  const [accountColor, setAccountColor] = useState<string | null>(null)
  const [addingCategoryType, setAddingCategoryType] = useState<'expense' | 'income' | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openAccountMenuId, setOpenAccountMenuId] = useState<string | null>(null)
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState<Category | null>(null)
  const [categoryEditName, setCategoryEditName] = useState('')
  const [categoryEditColor, setCategoryEditColor] = useState<string | null>(null)
  const [categorySaving, setCategorySaving] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const categoryMenuRef = useRef<HTMLDivElement | null>(null)
  //const accountCustomColorRef = useRef<HTMLInputElement>(null)
  //const categoryEditCustomColorRef = useRef<HTMLInputElement>(null)
  //const newCategoryCustomColorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (openAccountMenuId === null) return
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setOpenAccountMenuId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openAccountMenuId])

  useEffect(() => {
    if (openCategoryMenuId === null) return
    function handleClickOutside(e: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) setOpenCategoryMenuId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openCategoryMenuId])

  const openNewAccount = () => {
    setAccountForm('new')
    setAccountName('')
    setAccountInitialBalance('0')
    setAccountColor(null)
    setError(null)
  }

  const openEditAccount = (acc: Account) => {
    setAccountForm(acc)
    setAccountName(acc.name)
    setAccountInitialBalance(String(acc.initial_balance))
    setAccountColor(acc.color ?? null)
    setError(null)
  }

  const closeAccountForm = () => setAccountForm(null)

  const openEditCategory = (c: Category) => {
    setCategoryForm(c)
    setCategoryEditName(c.name)
    setCategoryEditColor(c.color ?? null)
    setError(null)
  }

  const closeCategoryForm = () => setCategoryForm(null)

  const handleSaveCategory = async () => {
    if (!categoryForm || !categoryEditName.trim()) return
    const trimmedName = categoryEditName.trim()
    if (trimmedName.length > CATEGORY_NAME_MAX_LENGTH) {
      setError(`Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or less`)
      return
    }
    if (categoryEditColor && !isHexColor(categoryEditColor)) {
      setError('Invalid color format')
      return
    }
    setError(null)
    setCategorySaving(true)
    try {
      if (categoryForm.type === 'expense') {
        await updateExpenseCategory(categoryForm.id, { name: trimmedName, color: categoryEditColor ?? null })
      } else {
        await updateIncomeCategory(categoryForm.id, { name: trimmedName, color: categoryEditColor ?? null })
      }
      closeCategoryForm()
    } catch (err) {
      logInternalError('Settings.handleSaveCategory', err)
      const msg = toUserErrorMessage(err, 'Failed to save')
      setError(msg)
      onError?.(msg)
    } finally {
      setCategorySaving(false)
    }
  }

  const handleSaveAccount = async () => {
    setError(null)
    setSaving(true)
    const trimmedName = accountName.trim()
    const num = parseFloat(accountInitialBalance)
    if (!Number.isFinite(num)) {
      setError('Enter a valid initial balance')
      setSaving(false)
      return
    }
    if (num > MAX_MONEY_AMOUNT || num < -MAX_MONEY_AMOUNT) {
      setError('Initial balance is too large')
      setSaving(false)
      return
    }
    if (!trimmedName) {
      setError('Enter a name')
      setSaving(false)
      return
    }
    if (trimmedName.length > ACCOUNT_NAME_MAX_LENGTH) {
      setError(`Account name must be ${ACCOUNT_NAME_MAX_LENGTH} characters or less`)
      setSaving(false)
      return
    }
    if (accountColor && !isHexColor(accountColor)) {
      setError('Invalid color format')
      setSaving(false)
      return
    }
    try {
      if (accountForm === 'new') {
        await addAccount({
          name: trimmedName,
          initial_balance: num,
          color: accountColor || undefined,
        })
      } else if (accountForm) {
        const update: { name: string; initial_balance: number; color: string | null } = {
          name: trimmedName,
          initial_balance: num,
          color: accountColor ?? null,
        }
        await updateAccount(accountForm.id, update)
      }
      closeAccountForm()
    } catch (err) {
      logInternalError('Settings.handleSaveAccount', err)
      const msg = toUserErrorMessage(err, 'Failed to save')
      setError(msg)
      onError?.(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!isUuid(id)) {
      onError?.('Invalid account id.')
      return
    }
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
      logInternalError('Settings.handleDeleteAccount', err)
      onError?.(toUserErrorMessage(err, 'Could not delete account.'))
    }
  }

  const openAddCategory = (type: 'expense' | 'income') => {
    setAddingCategoryType(type)
    setNewCategoryName('')
    setNewCategoryColor(null)
    setError(null)
  }

  const closeAddCategory = () => setAddingCategoryType(null)

  const handleSaveNewCategory = async () => {
    if (!addingCategoryType || !newCategoryName.trim()) return
    const trimmedName = newCategoryName.trim()
    if (trimmedName.length > CATEGORY_NAME_MAX_LENGTH) {
      setError(`Category name must be ${CATEGORY_NAME_MAX_LENGTH} characters or less`)
      return
    }
    if (newCategoryColor && !isHexColor(newCategoryColor)) {
      setError('Invalid color format')
      return
    }
    setError(null)
    setSaving(true)
    try {
      if (addingCategoryType === 'expense') {
        await addExpenseCategory({
          type: 'expense',
          name: trimmedName,
          color: newCategoryColor ?? null,
        })
      } else {
        await addIncomeCategory({
          type: 'income',
          name: trimmedName,
          color: newCategoryColor ?? null,
        })
      }
      closeAddCategory()
    } catch (err) {
      logInternalError('Settings.handleSaveNewCategory', err)
      const msg = toUserErrorMessage(err, 'Failed to add category')
      setError(msg)
      onError?.(msg)
    } finally {
      setSaving(false)
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
      logInternalError('Settings.handleDeleteExpenseCategory', err)
      onError?.(toUserErrorMessage(err, 'Could not delete category.'))
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
      logInternalError('Settings.handleDeleteIncomeCategory', err)
      onError?.(toUserErrorMessage(err, 'Could not delete category.'))
    }
  }

  const handleToggleHideBalance = async (acc: Account) => {
    try {
      await updateAccount(acc.id, { hide_balance: !acc.hide_balance })
    } catch (err) {
      logInternalError('Settings.handleToggleHideBalance', err)
      onError?.(toUserErrorMessage(err, 'Could not update account.'))
    }
  }

  const hasCustomAccountColor = !!accountColor && !ACCOUNT_PALETTE.some((hex) => hex === accountColor)
  const addCategoryPalette = addingCategoryType === 'expense' ? EXPENSE_CATEGORY_PALETTE : INCOME_CATEGORY_PALETTE
  const hasCustomNewCategoryColor = !!newCategoryColor && !addCategoryPalette.some((hex) => hex === newCategoryColor)
  const editCategoryPalette = categoryForm?.type === 'expense' ? EXPENSE_CATEGORY_PALETTE : INCOME_CATEGORY_PALETTE
  const hasCustomEditCategoryColor = !!categoryEditColor && !editCategoryPalette.some((hex) => hex === categoryEditColor)

  return (
    <div className="space-y-6">
      {(() => {
        void onBack
        return null
      })()}

      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Appearance
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
              Theme
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="ui-btn ui-btn-secondary"
            style={{ minHeight: 40, padding: '10px 12px', textTransform: 'none', letterSpacing: 0 }}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <IconMoon size={16} /> : <IconSun size={16} />}
            {dark ? 'Dark' : 'Light'}
          </button>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Accounts
        </h3>
        {accountsLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : accounts.length === 0 ? (
          <>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>No accounts yet. Add one below.</p>
            <button
              type="button"
              onClick={openNewAccount}
              className="ui-btn ui-btn-primary"
              style={{ minHeight: 40 }}
            >
              Add account
            </button>
          </>
        ) : (
          <>
            <ul className="space-y-2 mb-3">
              {accounts.map((acc, idx) => (
                <li
                  key={acc.id}
                  className="ui-card"
                  style={{ padding: 12 }}
                >
                  <div className="flex flex-1 min-w-0 items-center gap-2 flex-wrap">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: getAccountColor(acc, idx) }}
                      title="Account color"
                    />
                    <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{acc.name}</span>
                    <span className="text-sm ml-2" style={{ color: 'var(--text-secondary)' }}>
                      Initial: ${formatCurrency(Number(acc.initial_balance))}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={!!acc.hide_balance}
                        onChange={() => void handleToggleHideBalance(acc)}
                        className="rounded"
                      />
                      Hide balance
                    </label>
                    <div className="relative shrink-0" ref={openAccountMenuId === acc.id ? accountMenuRef : undefined}>
                      <button
                        type="button"
                        onClick={() => setOpenAccountMenuId(openAccountMenuId === acc.id ? null : acc.id)}
                        className="ui-btn ui-btn-ghost"
                        style={{ minHeight: 36, width: 40, padding: 0, textTransform: 'none', letterSpacing: 0 }}
                        aria-label="Actions"
                        aria-expanded={openAccountMenuId === acc.id}
                      >
                        ⋮
                      </button>
                      {openAccountMenuId === acc.id && (
                        <div className="absolute right-0 top-full mt-1 z-20 min-w-[8rem] ui-card" style={{ padding: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              openEditAccount(acc)
                              setOpenAccountMenuId(null)
                            }}
                            className="w-full text-left ui-btn ui-btn-ghost"
                            style={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, padding: '10px 10px', textTransform: 'none', letterSpacing: 0 }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteAccount(acc.id)
                              setOpenAccountMenuId(null)
                            }}
                            className="w-full text-left ui-btn ui-btn-ghost"
                            style={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, padding: '10px 10px', textTransform: 'none', letterSpacing: 0, color: 'var(--text-negative)' }}
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
              className="ui-btn ui-btn-primary"
              style={{ minHeight: 40 }}
            >
              Add account
            </button>
          </>
        )}
      </section>

      <section>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Expense categories
        </h3>
        {expenseCategories.length === 0 ? (
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>No expense categories yet. Add one below.</p>
        ) : null}
        <ul className="space-y-2 mb-3">
          {expenseCategories.map((c) => (
            <li
              key={c.id}
              className="ui-card"
              style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: c.color ?? EXPENSE_CATEGORY_PALETTE[0] }}
                  title="Category color"
                />
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
              </div>
              <div className="relative shrink-0" ref={openCategoryMenuId === c.id ? categoryMenuRef : undefined}>
                <button
                  type="button"
                  onClick={() => setOpenCategoryMenuId(openCategoryMenuId === c.id ? null : c.id)}
                  className="ui-btn ui-btn-ghost"
                  style={{ minHeight: 36, width: 40, padding: 0, textTransform: 'none', letterSpacing: 0 }}
                  aria-label="Actions"
                  aria-expanded={openCategoryMenuId === c.id}
                >
                  ⋮
                </button>
                {openCategoryMenuId === c.id && (
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[8rem] ui-card" style={{ padding: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        openEditCategory(c)
                        setOpenCategoryMenuId(null)
                      }}
                      className="w-full text-left ui-btn ui-btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, padding: '10px 10px', textTransform: 'none', letterSpacing: 0 }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteExpenseCategory(c.id)
                        setOpenCategoryMenuId(null)
                      }}
                      className="w-full text-left ui-btn ui-btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, padding: '10px 10px', textTransform: 'none', letterSpacing: 0, color: 'var(--text-negative)' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => openAddCategory('expense')}
          className="ui-btn ui-btn-primary"
          style={{ minHeight: 40 }}
        >
          Add expense category
        </button>
      </section>

      <section>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Income categories
        </h3>
        {incomeCategories.length === 0 ? (
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>No income categories yet. Add one below.</p>
        ) : null}
        <ul className="space-y-2 mb-3">
          {incomeCategories.map((c) => (
            <li
              key={c.id}
              className="ui-card"
              style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: c.color ?? INCOME_CATEGORY_PALETTE[0] }}
                  title="Category color"
                />
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
              </div>
              <div className="relative shrink-0" ref={openCategoryMenuId === c.id ? categoryMenuRef : undefined}>
                <button
                  type="button"
                  onClick={() => setOpenCategoryMenuId(openCategoryMenuId === c.id ? null : c.id)}
                  className="ui-btn ui-btn-ghost"
                  style={{ minHeight: 36, width: 40, padding: 0, textTransform: 'none', letterSpacing: 0 }}
                  aria-label="Actions"
                  aria-expanded={openCategoryMenuId === c.id}
                >
                  ⋮
                </button>
                {openCategoryMenuId === c.id && (
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[8rem] ui-card" style={{ padding: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        openEditCategory(c)
                        setOpenCategoryMenuId(null)
                      }}
                      className="w-full text-left ui-btn ui-btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, padding: '10px 10px', textTransform: 'none', letterSpacing: 0 }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteIncomeCategory(c.id)
                        setOpenCategoryMenuId(null)
                      }}
                      className="w-full text-left ui-btn ui-btn-ghost"
                      style={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, padding: '10px 10px', textTransform: 'none', letterSpacing: 0, color: 'var(--text-negative)' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => openAddCategory('income')}
          className="ui-btn ui-btn-primary"
          style={{ minHeight: 40 }}
        >
          Add income category
        </button>
      </section>

      {error && <p className="text-sm" style={{ color: 'var(--text-negative)' }}>{error}</p>}

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
                  maxLength={ACCOUNT_NAME_MAX_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                  placeholder="e.g. Checking"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial balance</label>
                <input
                  type="number"
                  step="0.01"
                  min={-MAX_MONEY_AMOUNT}
                  max={MAX_MONEY_AMOUNT}
                  value={accountInitialBalance}
                  onChange={(e) => setAccountInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ACCOUNT_PALETTE.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setAccountColor(hex)}
                      className={`w-6 h-6 rounded-full border-2 transition ${accountColor === hex ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent hover:border-gray-400'}`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                  <label
                    className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-gray-600 dark:hover:border-gray-300 transition shrink-0 cursor-pointer"
                    style={{ backgroundColor: hasCustomAccountColor ? accountColor : undefined }}
                  >
                    <input
                      type="color"
                      value={accountColor ?? ACCOUNT_PALETTE[0]}
                      onChange={(e) => setAccountColor(e.target.value)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                    <span className="text-sm font-medium leading-none">+</span>
                  </label>
                </div>
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

      {addingCategoryType && (
        <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {addingCategoryType === 'expense' ? 'Add expense category' : 'Add income category'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  maxLength={CATEGORY_NAME_MAX_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {addCategoryPalette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setNewCategoryColor(hex)}
                      className={`w-6 h-6 rounded-full border-2 transition ${newCategoryColor === hex ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent hover:border-gray-400'}`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                  <label
                    className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-gray-600 dark:hover:border-gray-300 transition shrink-0 cursor-pointer"
                    style={{ backgroundColor: hasCustomNewCategoryColor ? newCategoryColor : undefined }}
                  >
                    <input
                      type="color"
                      value={newCategoryColor ?? addCategoryPalette[0]}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                    <span className="text-sm font-medium leading-none">+</span>
                  </label>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeAddCategory}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewCategory}
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

      {categoryForm && (
        <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl p-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Edit category</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={categoryEditName}
                  onChange={(e) => setCategoryEditName(e.target.value)}
                  maxLength={CATEGORY_NAME_MAX_LENGTH}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {editCategoryPalette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setCategoryEditColor(hex)}
                      className={`w-6 h-6 rounded-full border-2 transition ${categoryEditColor === hex ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent hover:border-gray-400'}`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                  <label
                    className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-gray-600 dark:hover:border-gray-300 transition shrink-0 cursor-pointer"
                    style={{ backgroundColor: hasCustomEditCategoryColor ? categoryEditColor : undefined }}
                  >
                    <input
                      type="color"
                      value={categoryEditColor ?? editCategoryPalette[0]}
                      onChange={(e) => setCategoryEditColor(e.target.value)}
                      className="absolute opacity-0 w-0 h-0"
                    />
                    <span className="text-sm font-medium leading-none">+</span>
                  </label>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeCategoryForm}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={categorySaving}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {categorySaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
