import { useExpenses } from '../hooks/useExpenses'
import type { Expense } from '../types/expense'

interface ExpenseListProps {
  selectedMonth: string
  onEdit: (expense: Expense) => void
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function ExpenseList({ selectedMonth, onEdit }: ExpenseListProps) {
  const { expenses, loading, error, deleteExpense } = useExpenses(selectedMonth)

  if (error) {
    return (
      <p className="text-red-600 text-sm">Failed to load expenses: {error}</p>
    )
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading expenses…</p>
  }

  if (expenses.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">
        No expenses this month. Tap “Add expense” to add one.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {expenses.map((expense) => (
        <li
          key={expense.id}
          className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-2"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">
                ${Number(expense.amount).toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">{expense.category}</span>
              <span className="text-sm text-gray-400">
                {formatDate(expense.date)}
              </span>
            </div>
            {expense.description && (
              <p className="text-sm text-gray-600 mt-0.5 truncate">
                {expense.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
              aria-label="Edit"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this expense?')) {
                  deleteExpense(expense.id)
                }
              }}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
              aria-label="Delete"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
