import { useState, useEffect, useCallback } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import type { AccountWithBalance } from '../types/account'
import type { Transaction } from '../types/transaction'
import TransactionList from './TransactionList'

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
}

export default function Dashboard({ accounts, accountsLoading, accountsError, onAddTransaction, onOpenSettings, onEditTransaction, onMutationsReady, onAccountsRefetch }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

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
      await deleteTransaction(id)
      onAccountsRefetch?.()
    },
    [deleteTransaction, onAccountsRefetch]
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

  if (accountsError) {
    return (
      <p className="text-red-600 text-sm p-4">Failed to load accounts: {accountsError}</p>
    )
  }

  return (
    <div className="space-y-4">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-700">Accounts</h2>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Settings
          </button>
        </div>
        {accountsLoading ? (
          <p className="text-gray-500 text-sm">Loading accounts…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedAccountId(null)}
              className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                selectedAccountId === null
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() =>
                  setSelectedAccountId(selectedAccountId === acc.id ? null : acc.id)
                }
                className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                  selectedAccountId === acc.id
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {acc.name}: ${(acc as AccountWithBalance).balance.toFixed(2)}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-200"
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="text-sm font-medium text-gray-700">
          {formatMonthLabel(selectedMonth)}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-200"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <p className="text-xs text-green-700">Income</p>
          <p className="text-sm font-semibold text-green-800">
            ${summary.income.toFixed(2)}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-xs text-red-700">Expenses</p>
          <p className="text-sm font-semibold text-red-800">
            ${summary.expenses.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-2">
          <p className="text-xs text-gray-700">Net</p>
          <p className="text-sm font-semibold text-gray-800">
            ${summary.net.toFixed(2)}
          </p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-medium text-gray-700 mb-2">Transactions</h2>
        <TransactionList
          transactions={transactions}
          accounts={accounts}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          loading={txLoading}
          error={txError}
          onEdit={onEditTransaction}
          onDelete={handleDeleteTransaction}
        />
      </section>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onAddTransaction}
          className="py-3 px-6 bg-blue-600 text-white font-medium rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add transaction
        </button>
      </div>
    </div>
  )
}
