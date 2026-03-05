import { useState, useMemo, useRef, useEffect } from 'react'
import { useBudgets } from '../hooks/useBudgets'
import { useBudgetPeriodTransactions } from '../hooks/useBudgetPeriodTransactions'
import { useCategories } from '../hooks/useCategories'
import { computeBudgetStatus } from '../utils/budgetPeriods'
import { formatCurrency } from '../utils/format'
import type { BudgetWithCategories } from '../types/budget'
import type { BudgetPeriodType } from '../types/budget'
import { BUDGET_NAME_MAX_LENGTH, MAX_MONEY_AMOUNT } from '../constants/limits'
import { logInternalError, toUserErrorMessage } from '../utils/errors'

interface BudgetsProps {
  onBack: () => void
  onError?: (message: string) => void
}

const PERIOD_LABELS: Record<BudgetPeriodType, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
}

export default function Budgets({ onBack, onError }: BudgetsProps) {
  const { budgets, loading: budgetsLoading, error: budgetsError, addBudget, updateBudget, deleteBudget, setBudgetCategories } = useBudgets()
  const { categories: expenseCategories } = useCategories('expense')
  const { getTransactionsForPeriod, loading: txLoading } = useBudgetPeriodTransactions()

  const [formOpen, setFormOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetWithCategories | null>(null)
  const [formName, setFormName] = useState('')
  const [formPeriodType, setFormPeriodType] = useState<BudgetPeriodType>('monthly')
  const [formAmount, setFormAmount] = useState('')
  const [formCumulative, setFormCumulative] = useState(false)
  const [formCategoryIds, setFormCategoryIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [menuBudgetId, setMenuBudgetId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const loading = budgetsLoading || txLoading

  const statusByBudgetId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeBudgetStatus>>()
    for (const budget of budgets) {
      const current = getTransactionsForPeriod(budget.period_type, 'current')
      const previous = getTransactionsForPeriod(budget.period_type, 'previous')
      const status = computeBudgetStatus(budget, budget.category_ids, current, previous)
      map.set(budget.id, status)
    }
    return map
  }, [budgets, getTransactionsForPeriod])

  useEffect(() => {
    if (menuBudgetId === null) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuBudgetId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuBudgetId])

  const openAddForm = () => {
    setEditingBudget(null)
    setFormName('')
    setFormPeriodType('monthly')
    setFormAmount('')
    setFormCumulative(false)
    setFormCategoryIds(expenseCategories[0] ? [expenseCategories[0].id] : [])
    setFormError(null)
    setFormOpen(true)
  }

  const openEditForm = (budget: BudgetWithCategories) => {
    setEditingBudget(budget)
    setFormName(budget.name)
    setFormPeriodType(budget.period_type)
    setFormAmount(String(budget.amount))
    setFormCumulative(budget.cumulative)
    setFormCategoryIds([...budget.category_ids])
    setFormError(null)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingBudget(null)
  }

  const toggleCategory = (categoryId: string) => {
    setFormCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  const handleSaveBudget = async () => {
    setFormError(null)
    const name = formName.trim()
    const amount = parseFloat(formAmount)
    if (!name) {
      setFormError('Enter a name')
      return
    }
    if (name.length > BUDGET_NAME_MAX_LENGTH) {
      setFormError(`Name must be ${BUDGET_NAME_MAX_LENGTH} characters or less`)
      return
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError('Enter a valid amount')
      return
    }
    if (amount > MAX_MONEY_AMOUNT) {
      setFormError('Amount is too large')
      return
    }
    if (formCategoryIds.length === 0) {
      setFormError('Select at least one category')
      return
    }
    setSaving(true)
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          name,
          period_type: formPeriodType,
          amount,
          cumulative: formCumulative,
        })
        await setBudgetCategories(editingBudget.id, formCategoryIds)
      } else {
        const newId = await addBudget({
          name,
          period_type: formPeriodType,
          amount,
          cumulative: formCumulative,
          sort_order: 0,
        })
        await setBudgetCategories(newId, formCategoryIds)
      }
      closeForm()
    } catch (err) {
      logInternalError('Budgets.handleSaveBudget', err)
      const msg = toUserErrorMessage(err, 'Failed to save')
      setFormError(msg)
      onError?.(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm('Delete this budget? This cannot be undone.')) return
    setMenuBudgetId(null)
    try {
      await deleteBudget(id)
    } catch (err) {
      logInternalError('Budgets.handleDeleteBudget', err)
      onError?.(toUserErrorMessage(err, 'Could not delete budget.'))
    }
  }

  const categoryName = (id: string) => expenseCategories.find((c) => c.id === id)?.name ?? ''

  if (budgetsError) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
          ← Back
        </button>
        <p className="text-red-600 dark:text-red-400 text-sm">{budgetsError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Budgets</h2>
        <button
          type="button"
          onClick={openAddForm}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          + Add budget
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing status for the current period. Weekly resets Monday–Sunday; biweekly uses 1–14 and 15–end of month.
      </p>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
      ) : budgets.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-800 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-3">No budgets yet.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Set spending limits by period and category to track how much you have left.</p>
          <button
            type="button"
            onClick={openAddForm}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Add budget
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => {
            const status = statusByBudgetId.get(budget.id)
            if (!status) return null
            const effective = status.effective
            const spent = status.spent
            const pct = effective > 0 ? Math.min(1, spent / effective) : 0
            const overPct = effective > 0 && status.isOver ? Math.min(1, -status.remaining / effective) : 0
            return (
              <li
                key={budget.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate">{budget.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {PERIOD_LABELS[budget.period_type]}
                      </span>
                      {budget.cumulative && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                          Cumulative
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative shrink-0" ref={menuBudgetId === budget.id ? menuRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setMenuBudgetId(menuBudgetId === budget.id ? null : budget.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                      aria-label="Budget actions"
                      aria-expanded={menuBudgetId === budget.id}
                    >
                      ⋮
                    </button>
                    {menuBudgetId === budget.id && (
                      <div className="absolute right-0 top-full mt-1 z-20 min-w-[7rem] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            openEditForm(budget)
                            setMenuBudgetId(null)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteBudget(budget.id)}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {budget.category_ids.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Categories: {budget.category_ids.map(categoryName).join(', ')}
                  </p>
                )}
                {status.carried > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                    Including ${formatCurrency(status.carried)} carried from last period.
                  </p>
                )}
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">
                    ${formatCurrency(spent)} of ${formatCurrency(effective)} spent
                  </span>
                  {status.isOver ? (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      ${formatCurrency(-status.remaining)} over
                    </span>
                  ) : (
                    <span className="font-medium text-green-600 dark:text-green-400">
                      ${formatCurrency(status.remaining)} left
                    </span>
                  )}
                </div>
                <div
                  className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex"
                  role="progressbar"
                  aria-valuenow={effective > 0 ? spent : 0}
                  aria-valuemin={0}
                  aria-valuemax={effective}
                  aria-label={`Budget progress: ${formatCurrency(spent)} spent of ${formatCurrency(effective)}`}
                >
                  <div
                    className="h-full bg-blue-500 dark:bg-blue-600 transition-all"
                    style={{ width: `${pct * 100}%` }}
                  />
                  {status.isOver && (
                    <div
                      className="h-full bg-red-500 dark:bg-red-600 transition-all"
                      style={{ width: `${overPct * 100}%` }}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              {editingBudget ? 'Edit budget' : 'Add budget'}
            </h3>
            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{formError}</p>
            )}
            <div className="space-y-3">
              <div>
                <label htmlFor="budget-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  id="budget-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={BUDGET_NAME_MAX_LENGTH}
                  placeholder="e.g. Groceries"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                />
              </div>
              <div>
                <label htmlFor="budget-period" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Period
                </label>
                <select
                  id="budget-period"
                  value={formPeriodType}
                  onChange={(e) => setFormPeriodType(e.target.value as BudgetPeriodType)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                >
                  <option value="weekly">Weekly (Mon–Sun)</option>
                  <option value="biweekly">Biweekly (1–14, 15–end)</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label htmlFor="budget-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount ($)
                </label>
                <input
                  id="budget-amount"
                  type="number"
                  min="0"
                  max={MAX_MONEY_AMOUNT}
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formCumulative}
                  onChange={(e) => setFormCumulative(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Cumulative (carry over overspend to next period)</span>
              </label>
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categories (at least one)</span>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {expenseCategories.map((cat) => (
                    <label key={cat.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formCategoryIds.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveBudget()}
                disabled={saving}
                className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingBudget ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
