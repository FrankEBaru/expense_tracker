import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { useBudgets } from '../hooks/useBudgets'
import { useBudgetPeriodTransactions } from '../hooks/useBudgetPeriodTransactions'
import { computeBudgetStatus } from '../utils/budgetPeriods'
import type { AccountWithBalance } from '../types/account'
import type { Transaction } from '../types/transaction'
import type { Category } from '../types/category'
import TransactionList from './TransactionList'
import CategoryCharts from './CategoryCharts'
import CategoryFilterDropdown from './CategoryFilterDropdown'
import { formatCurrency } from '../utils/format'
import { getAccountColor } from '../constants/colors'
import { logInternalError, toUserErrorMessage } from '../utils/errors'
import { IconChevronLeft, IconChevronRight } from './ui/icons'

export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category'

function filterByCategories(transactions: Transaction[], categoryIds: string[]): Transaction[] {
  if (categoryIds.length === 0) return transactions
  const set = new Set(categoryIds)
  return transactions.filter((tx) => {
    if (tx.type === 'transfer') return false
    return tx.category_id != null && set.has(tx.category_id)
  })
}

function sortTransactions(transactions: Transaction[], sort: SortOption, expenseCategories: Category[], incomeCategories: Category[]): Transaction[] {
  const getCategoryName = (tx: Transaction) => {
    if (!tx.category_id) return ''
    if (tx.type === 'expense') return expenseCategories.find((c) => c.id === tx.category_id)?.name ?? ''
    return incomeCategories.find((c) => c.id === tx.category_id)?.name ?? ''
  }
  const sorted = [...transactions]
  switch (sort) {
    case 'date-desc':
      sorted.sort((a, b) => (b.date === a.date ? 0 : b.date > a.date ? 1 : -1))
      break
    case 'date-asc':
      sorted.sort((a, b) => (a.date === b.date ? 0 : a.date > b.date ? 1 : -1))
      break
    case 'amount-desc':
      sorted.sort((a, b) => Number(b.amount) - Number(a.amount))
      break
    case 'amount-asc':
      sorted.sort((a, b) => Number(a.amount) - Number(b.amount))
      break
    case 'category':
      sorted.sort((a, b) => {
        const na = getCategoryName(a)
        const nb = getCategoryName(b)
        return na.localeCompare(nb) || (b.date.localeCompare(a.date))
      })
      break
    default:
      break
  }
  return sorted
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function computeMonthSummary(transactions: Transaction[]) {
  let income = 0
  let expenses = 0
  for (const tx of transactions) {
    if (tx.type === 'income') income += Number(tx.amount)
    if (tx.type === 'expense') expenses += Number(tx.amount)
  }
  return { income, expenses, net: income - expenses }
}

type TransactionMutations = {
  addTransaction: (insert: import('../types/transaction').TransactionInsert) => Promise<void>
  updateTransaction: (id: string, update: import('../types/transaction').TransactionUpdate) => Promise<void>
}

interface DashboardProps {
  accounts: AccountWithBalance[]
  accountsLoading: boolean
  accountsError: string | null
  onAddTransaction: () => void
  onEditTransaction: (tx: Transaction) => void
  onMutationsReady?: (mutations: TransactionMutations) => void
  onAccountsRefetch?: () => void
  onError?: (message: string) => void
  onOpenBudgets?: () => void
}

export default function Dashboard({ accounts, accountsLoading, accountsError, onAddTransaction: _onAddTransaction, onEditTransaction, onMutationsReady, onAccountsRefetch, onError, onOpenBudgets }: DashboardProps) {
  void _onAddTransaction
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<SortOption>('date-desc')

  const {
    transactions,
    loading: txLoading,
    error: txError,
    deleteTransaction,
    addTransaction,
    updateTransaction,
  } = useTransactions(selectedMonth, selectedAccountId)
  const { categories: expenseCategories } = useCategories('expense')
  const { categories: incomeCategories } = useCategories('income')
  const { budgets, loading: budgetsLoading } = useBudgets()
  const { getTransactionsForPeriod, loading: budgetTxLoading, refetch: refetchBudgetTransactions } = useBudgetPeriodTransactions()

  const budgetStatuses = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeBudgetStatus>>()
    for (const budget of budgets) {
      const current = getTransactionsForPeriod(budget.period_type, 'current')
      const previous = getTransactionsForPeriod(budget.period_type, 'previous')
      map.set(budget.id, computeBudgetStatus(budget, budget.category_ids, current, previous))
    }
    return map
  }, [budgets, getTransactionsForPeriod])

  const addTransactionAndRefresh = useCallback(
    async (insert: import('../types/transaction').TransactionInsert) => {
      await addTransaction(insert)
      onAccountsRefetch?.()
      await refetchBudgetTransactions()
    },
    [addTransaction, onAccountsRefetch, refetchBudgetTransactions]
  )

  const updateTransactionAndRefresh = useCallback(
    async (id: string, update: import('../types/transaction').TransactionUpdate) => {
      await updateTransaction(id, update)
      onAccountsRefetch?.()
      await refetchBudgetTransactions()
    },
    [updateTransaction, onAccountsRefetch, refetchBudgetTransactions]
  )

  useEffect(() => {
    onMutationsReady?.({ addTransaction: addTransactionAndRefresh, updateTransaction: updateTransactionAndRefresh })
  }, [addTransactionAndRefresh, updateTransactionAndRefresh, onMutationsReady])

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this transaction?')) return
      try {
        await deleteTransaction(id)
        onAccountsRefetch?.()
        await refetchBudgetTransactions()
      } catch (err) {
        logInternalError('Dashboard.handleDeleteTransaction', err)
        onError?.(toUserErrorMessage(err, 'Could not delete transaction.'))
      }
    },
    [deleteTransaction, onAccountsRefetch, onError, refetchBudgetTransactions]
  )

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setSelectedMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    setSelectedMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const summary = computeMonthSummary(transactions)

  const filteredTransactions = useMemo(
    () => filterByCategories(transactions, selectedCategoryIds),
    [transactions, selectedCategoryIds]
  )
  const filteredSortedTransactions = useMemo(
    () => sortTransactions(filteredTransactions, sortOption, expenseCategories, incomeCategories),
    [filteredTransactions, sortOption, expenseCategories, incomeCategories]
  )

  if (accountsError) {
    return (
      <div className="ui-card p-4">
        <p className="text-sm" style={{ color: 'var(--text-negative)' }}>
          Failed to load accounts: {accountsError}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Accounts
          </h2>
        </div>
        {accountsLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading accounts…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No accounts yet. Add one in Settings.</p>
        ) : (
          <>
            <div className="mb-3">
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Your balance is</p>
              <p style={{ fontSize: 'var(--font-hero)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                {(() => {
                  const visible = accounts.filter((a) => !a.hide_balance)
                  if (visible.length === 0) return '—'
                  const sum = visible.reduce((s, a) => s + (a as AccountWithBalance).balance, 0)
                  return `$${formatCurrency(sum)}`
                })()}
              </p>
            </div>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedAccountId(null)}
                  className="w-full text-left ui-card-inner"
                  style={{
                    padding: '12px 14px',
                    background: selectedAccountId === null ? 'var(--color-bg-secondary)' : 'transparent',
                    border: `1px solid ${selectedAccountId === null ? 'var(--border-soft)' : 'transparent'}`,
                    color: 'var(--text-primary)',
                    minHeight: 44,
                    borderRadius: 16,
                  }}
                >
                  All
                </button>
              </li>
              {accounts.map((acc, idx) => {
                const balance = (acc as AccountWithBalance).balance
                const balanceStr = acc.hide_balance ? '•••' : `$${formatCurrency(balance)}`
                return (
                  <li key={acc.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAccountId(selectedAccountId === acc.id ? null : acc.id)
                      }
                      className="w-full text-left ui-card-inner"
                      style={{
                        padding: '12px 14px',
                        background: selectedAccountId === acc.id ? 'var(--color-bg-secondary)' : 'transparent',
                        border: `1px solid ${selectedAccountId === acc.id ? 'var(--border-soft)' : 'transparent'}`,
                        color: 'var(--text-primary)',
                        minHeight: 44,
                        borderRadius: 16,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: getAccountColor(acc, idx) }}
                          aria-hidden
                        />
                        <span className="truncate">{acc.name}</span>
                      </span>
                      <span className="shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>{balanceStr}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Budgets
          </h2>
          {onOpenBudgets && (
            <button
              type="button"
              onClick={onOpenBudgets}
              className="ui-btn ui-btn-ghost"
              style={{ minHeight: 32, padding: '6px 10px', textTransform: 'none', letterSpacing: 0 }}
            >
              View all
            </button>
          )}
        </div>
        {budgetsLoading || budgetTxLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
        ) : budgets.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No budgets set. Set up budgets to track spending.{' '}
            {onOpenBudgets && (
              <button
                type="button"
                onClick={onOpenBudgets}
                className="ui-btn ui-btn-secondary"
                style={{ minHeight: 32, padding: '6px 10px', textTransform: 'none', letterSpacing: 0, display: 'inline-flex' }}
              >
                Set up
              </button>
            )}
          </p>
        ) : (
          <ul className="space-y-2">
            {budgets.map((budget) => {
              const status = budgetStatuses.get(budget.id)
              if (!status) return null
              return (
                <li key={budget.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{budget.name}</span>
                  {status.isOver ? (
                    <span className="font-medium shrink-0" style={{ color: 'var(--text-negative)' }}>
                      ${formatCurrency(-status.remaining)} over
                    </span>
                  ) : (
                    <span className="font-medium shrink-0" style={{ color: 'var(--text-positive)' }}>
                      ${formatCurrency(status.remaining)} left
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="ui-btn ui-btn-secondary"
          style={{ minHeight: 40, width: 44, padding: 0, borderRadius: 16 }}
          aria-label="Previous month"
        >
          <IconChevronLeft size={18} />
        </button>
        <span
          style={{
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: '-0.01em',
            color: 'var(--text-secondary)',
          }}
        >
          {formatMonthLabel(selectedMonth)}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="ui-btn ui-btn-secondary"
          style={{ minHeight: 40, width: 44, padding: 0, borderRadius: 16 }}
          aria-label="Next month"
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div
          className="ui-card-inner"
          style={{
            background: '#ffffff',
            padding: 12,
            borderRadius: 16,
            border: '1px solid var(--border-softer)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--text-positive)', fontWeight: 900 }}>
            Income
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-positive)', fontVariantNumeric: 'tabular-nums' }}>
            ${formatCurrency(summary.income)}
          </p>
        </div>
        <div
          className="ui-card-inner"
          style={{
            background: '#ffffff',
            padding: 12,
            borderRadius: 16,
            border: '1px solid var(--border-softer)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--text-negative)', fontWeight: 900 }}>
            Expenses
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-negative)', fontVariantNumeric: 'tabular-nums' }}>
            ${formatCurrency(summary.expenses)}
          </p>
        </div>
        <div
          className="ui-card-inner"
          style={{
            background: '#ffffff',
            padding: 12,
            borderRadius: 16,
            border: '1px solid var(--border-softer)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
            Net
          </p>
          <p
            className="text-sm font-semibold"
            style={{
              color:
                summary.net > 0 ? 'var(--text-positive)' : summary.net < 0 ? 'var(--text-negative)' : 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${formatCurrency(summary.net)}
          </p>
        </div>
      </div>

      <CategoryCharts
        transactions={transactions}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
      />

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h2 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Transactions
          </h2>
          <div className="ui-pill flex flex-wrap items-stretch gap-2" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--border-softer)', padding: 6 }}>
            <CategoryFilterDropdown
              expenseCategories={expenseCategories}
              incomeCategories={incomeCategories}
              selectedIds={selectedCategoryIds}
              onChange={setSelectedCategoryIds}
            />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="ui-select"
              aria-label="Sort transactions"
              style={{ width: 'auto', minHeight: 40, paddingTop: 8, paddingBottom: 8 }}
            >
              <option value="date-desc">Date (newest)</option>
              <option value="date-asc">Date (oldest)</option>
              <option value="amount-desc">Amount (high)</option>
              <option value="amount-asc">Amount (low)</option>
              <option value="category">Category A–Z</option>
            </select>
          </div>
        </div>
        <TransactionList
          transactions={filteredSortedTransactions}
          accounts={accounts}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          loading={txLoading}
          error={txError}
          onEdit={onEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      </section>
    </div>
  )
}
