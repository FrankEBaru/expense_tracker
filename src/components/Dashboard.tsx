import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import type { AccountWithBalance } from '../types/account'
import type { Transaction } from '../types/transaction'
import type { Category } from '../types/category'
import TransactionList from './TransactionList'
import CategoryCharts from './CategoryCharts'
import CategoryFilterDropdown from './CategoryFilterDropdown'

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
  onOpenSettings: () => void
  onEditTransaction: (tx: Transaction) => void
  onMutationsReady?: (mutations: TransactionMutations) => void
  onAccountsRefetch?: () => void
  onError?: (message: string) => void
}

export default function Dashboard({ accounts, accountsLoading, accountsError, onAddTransaction, onOpenSettings, onEditTransaction, onMutationsReady, onAccountsRefetch, onError }: DashboardProps) {
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

  useEffect(() => {
    onMutationsReady?.({ addTransaction, updateTransaction })
  }, [addTransaction, updateTransaction, onMutationsReady])

  const handleDeleteTransaction = useCallback(
    async (id: string) => {
      try {
        await deleteTransaction(id)
        onAccountsRefetch?.()
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Could not delete transaction.')
      }
    },
    [deleteTransaction, onAccountsRefetch, onError]
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
      <p className="text-red-600 text-sm p-4 dark:text-red-400">Failed to load accounts: {accountsError}</p>
    )
  }

  return (
    <div className="space-y-4">
      <section className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Accounts</h2>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Settings
          </button>
        </div>
        {accountsLoading ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading accounts…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No accounts yet. Add one in Settings.</p>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {(() => {
                  const visible = accounts.filter((a) => !a.hide_balance)
                  if (visible.length === 0) return '—'
                  const sum = visible.reduce((s, a) => s + (a as AccountWithBalance).balance, 0)
                  return `$${sum.toFixed(2)}`
                })()}
              </p>
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedAccountId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                    selectedAccountId === null
                      ? 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200'
                      : 'border border-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All
                </button>
              </li>
              {accounts.map((acc) => {
                const balance = (acc as AccountWithBalance).balance
                const balanceStr = acc.hide_balance ? '•••' : `$${balance.toFixed(2)}`
                return (
                  <li key={acc.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAccountId(selectedAccountId === acc.id ? null : acc.id)
                      }
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex justify-between items-center ${
                        selectedAccountId === acc.id
                          ? 'bg-blue-100 border border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200'
                          : 'border border-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{acc.name}</span>
                      <span>{balanceStr}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {formatMonthLabel(selectedMonth)}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 dark:bg-green-900/20 dark:border-green-800">
          <p className="text-xs text-green-700 dark:text-green-400">Income</p>
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            ${summary.income.toFixed(2)}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-xs text-red-700 dark:text-red-400">Expenses</p>
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            ${summary.expenses.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600">
          <p className="text-xs text-gray-700 dark:text-gray-400">Net</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            ${summary.net.toFixed(2)}
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
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Transactions</h2>
          <CategoryFilterDropdown
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            selectedIds={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
          />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            aria-label="Sort transactions"
          >
            <option value="date-desc">Date (newest)</option>
            <option value="date-asc">Date (oldest)</option>
            <option value="amount-desc">Amount (high)</option>
            <option value="amount-asc">Amount (low)</option>
            <option value="category">Category A–Z</option>
          </select>
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
