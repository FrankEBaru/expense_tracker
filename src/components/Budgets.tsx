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

export default function Budgets({ onBack: _onBack, onError }: BudgetsProps) {
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
        <div className="ui-card p-4">
          <p className="text-sm" style={{ color: 'var(--text-negative)' }}>{budgetsError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!loading && budgets.length > 0 && (
        <div className="flex justify-end">
          <button type="button" onClick={openAddForm} className="ui-btn ui-btn-primary" style={{ minHeight: 40, textTransform: 'none', letterSpacing: 0 }}>
            Add budget
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : budgets.length === 0 ? (
        <div className="ui-card p-6 text-center">
          <p style={{ color: 'var(--text-primary)', fontWeight: 800, marginBottom: 8 }}>No budgets yet.</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
            Set spending limits by period and category to track how much you have left.
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="ui-btn ui-btn-primary"
          >
            Add budget
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => {
            const status = statusByBudgetId.get(budget.id)
            if (!status) return null
            const effective = status.effective
            const spent = status.spent
            const denom = effective > 0 ? effective : 0
            const spentShare = denom > 0 ? Math.min(1, spent / denom) : spent > 0 ? 1 : 0
            const overShare = denom > 0 && status.isOver ? Math.min(1, Math.max(0, -status.remaining / denom)) : 0
            const remainingShare = denom > 0 && !status.isOver ? Math.min(1, Math.max(0, status.remaining / denom)) : 0
            const sum = spentShare + overShare + remainingShare
            const scale = sum > 1 ? 1 / sum : 1
            const spentW = spentShare * scale
            const overW = overShare * scale
            const remW = remainingShare * scale
            return (
              <li
                key={budget.id}
                className="ui-card"
                style={{ padding: 'var(--space-card)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{budget.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="ui-badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--text-secondary)' }}>
                        {PERIOD_LABELS[budget.period_type]}
                      </span>
                      {budget.cumulative && (
                        <span className="ui-badge" style={{ background: 'rgba(245,166,35,0.20)', borderColor: 'rgba(245,166,35,0.25)' }}>
                          Cumulative
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative shrink-0" ref={menuBudgetId === budget.id ? menuRef : undefined}>
                    <button
                      type="button"
                      onClick={() => setMenuBudgetId(menuBudgetId === budget.id ? null : budget.id)}
                      className="ui-btn ui-btn-ghost"
                      style={{ minHeight: 36, width: 40, padding: 0, textTransform: 'none', letterSpacing: 0 }}
                      aria-label="Budget actions"
                      aria-expanded={menuBudgetId === budget.id}
                    >
                      ⋮
                    </button>
                    {menuBudgetId === budget.id && (
                      <div className="absolute right-0 top-full mt-1 z-20 min-w-[8rem] ui-card" style={{ padding: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            openEditForm(budget)
                            setMenuBudgetId(null)
                          }}
                          className="w-full text-left ui-btn ui-btn-ghost"
                          style={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, padding: '10px 10px', textTransform: 'none', letterSpacing: 0 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteBudget(budget.id)}
                          className="w-full text-left ui-btn ui-btn-ghost"
                          style={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, padding: '10px 10px', textTransform: 'none', letterSpacing: 0, color: 'var(--text-negative)' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {budget.category_ids.length > 0 && (
                  <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Categories: {budget.category_ids.map(categoryName).join(', ')}
                  </p>
                )}
                {status.carried > 0 && (
                  <p className="text-xs mb-2" style={{ color: 'var(--color-amber)' }}>
                    Including ${formatCurrency(status.carried)} carried from last period.
                  </p>
                )}
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    ${formatCurrency(spent)} of ${formatCurrency(effective)} spent
                  </span>
                  {status.isOver ? (
                    <span className="font-medium" style={{ color: 'var(--text-negative)' }}>
                      ${formatCurrency(-status.remaining)} over
                    </span>
                  ) : (
                    <span className="font-medium" style={{ color: 'var(--text-positive)' }}>
                      ${formatCurrency(status.remaining)} left
                    </span>
                  )}
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden flex"
                  role="progressbar"
                  aria-valuenow={effective > 0 ? spent : 0}
                  aria-valuemin={0}
                  aria-valuemax={effective}
                  aria-label={`Budget progress: ${formatCurrency(spent)} spent of ${formatCurrency(effective)}`}
                  style={{ background: 'rgba(17,17,17,0.10)' }}
                >
                  <div
                    className="h-full transition-all"
                    style={{ width: `${spentW * 100}%`, background: 'rgba(61,171,106,0.95)' }}
                    aria-hidden
                    title="Spent"
                  />
                  {status.isOver && (
                    <div
                      className="h-full transition-all"
                      style={{ width: `${overW * 100}%`, background: 'var(--text-negative)' }}
                      aria-hidden
                      title="Over budget"
                    />
                  )}
                  {!status.isOver && (
                    <div
                      className="h-full transition-all"
                      style={{ width: `${remW * 100}%`, background: 'rgba(17,17,17,0.06)' }}
                      aria-hidden
                      title="Remaining"
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
          <div className="ui-sheet max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12 }}>
              {editingBudget ? 'Edit budget' : 'Add budget'}
            </h3>
            {formError && (
              <p className="text-sm mb-3" style={{ color: 'var(--text-negative)' }}>{formError}</p>
            )}
            <div className="space-y-3">
              <div>
                <label htmlFor="budget-name" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Name
                </label>
                <input
                  id="budget-name"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  maxLength={BUDGET_NAME_MAX_LENGTH}
                  placeholder="e.g. Groceries"
                  className="ui-input"
                />
              </div>
              <div>
                <label htmlFor="budget-period" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Period
                </label>
                <select
                  id="budget-period"
                  value={formPeriodType}
                  onChange={(e) => setFormPeriodType(e.target.value as BudgetPeriodType)}
                  className="ui-select"
                >
                  <option value="weekly">Weekly (Mon–Sun)</option>
                  <option value="biweekly">Biweekly (1–14, 15–end)</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label htmlFor="budget-amount" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
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
                  className="ui-input"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formCumulative}
                  onChange={(e) => setFormCumulative(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Cumulative (carry over overspend to next period)</span>
              </label>
              <div>
                <span className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Categories (at least one)</span>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 ui-card-inner" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border-softer)', borderRadius: 16 }}>
                  {expenseCategories.map((cat) => (
                    <label key={cat.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formCategoryIds.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={closeForm}
                className="ui-btn ui-btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveBudget()}
                disabled={saving}
                className="ui-btn ui-btn-primary"
                style={{ flex: 1 }}
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
