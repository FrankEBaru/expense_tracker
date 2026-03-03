import type { Transaction } from '../types/transaction'
import type { Account } from '../types/account'
import type { Category } from '../types/category'

interface TransactionListProps {
  transactions: Transaction[]
  accounts: Account[]
  expenseCategories: Category[]
  incomeCategories: Category[]
  loading: boolean
  error: string | null
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function getAccountName(accounts: Account[], id: string | null): string {
  if (!id) return ''
  return accounts.find((a) => a.id === id)?.name ?? ''
}

function getCategoryName(expense: Category[], income: Category[], type: string, categoryId: string | null): string {
  if (!categoryId) return ''
  if (type === 'expense') return expense.find((c) => c.id === categoryId)?.name ?? ''
  return income.find((c) => c.id === categoryId)?.name ?? ''
}

export default function TransactionList({
  transactions,
  accounts,
  expenseCategories,
  incomeCategories,
  loading,
  error,
  onEdit,
  onDelete,
}: TransactionListProps) {
  if (error) {
    return (
      <p className="text-red-600 text-sm">Failed to load transactions: {error}</p>
    )
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading transactions…</p>
  }

  if (transactions.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">
        No transactions this month. Add an expense, income, or transfer.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {transactions.map((tx) => {
        const isExpense = tx.type === 'expense'
        const isTransfer = tx.type === 'transfer'
        const amount = Number(tx.amount)
        const categoryName = getCategoryName(
          expenseCategories,
          incomeCategories,
          tx.type,
          tx.category_id
        )
        const fromName = getAccountName(accounts, tx.from_account_id)
        const toName = getAccountName(accounts, tx.to_account_id)
        const accountName = getAccountName(accounts, tx.account_id)

        let label: string
        if (isTransfer) label = `${fromName} → ${toName}`
        else label = categoryName || accountName || tx.type

        return (
          <li
            key={tx.id}
            className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className={`font-semibold ${
                    isExpense ? 'text-red-700' : isTransfer ? 'text-gray-800' : 'text-green-700'
                  }`}
                >
                  {isExpense ? '-' : ''}${amount.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 capitalize">{tx.type}</span>
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm text-gray-400">{formatDate(tx.date)}</span>
              </div>
              {tx.description && (
                <p className="text-sm text-gray-600 mt-0.5 truncate">{tx.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onEdit(tx)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
                aria-label="Edit"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this transaction?')) onDelete(tx.id)
                }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                aria-label="Delete"
              >
                Delete
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
