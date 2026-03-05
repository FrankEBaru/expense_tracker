import type { Transaction } from '../types/transaction'
import type { Category } from '../types/category'
import { getCategoryColor, EXPENSE_CATEGORY_PALETTE } from '../constants/colors'
import { formatCurrency } from '../utils/format'

interface CategoryChartsProps {
  transactions: Transaction[]
  expenseCategories: Category[]
  incomeCategories: Category[]
}

function sumByCategory(
  transactions: Transaction[],
  type: 'expense' | 'income',
  categories: Category[]
): { id: string; name: string; total: number }[] {
  const map = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type !== type || !tx.category_id) continue
    const current = map.get(tx.category_id) ?? 0
    map.set(tx.category_id, current + Number(tx.amount))
  }
  return categories
    .map((c) => ({ id: c.id, name: c.name, total: map.get(c.id) ?? 0 }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
}

function BarChart({
  title,
  items,
  categories,
  emptyMessage,
}: {
  title: string
  items: { id: string; name: string; total: number }[]
  categories: Category[]
  emptyMessage: string
}) {
  const max = Math.max(1, ...items.map((i) => i.total))
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 min-w-0">
      <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 truncate">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, idx) => {
            const barColor = getCategoryColor(item.id, categories, idx, EXPENSE_CATEGORY_PALETTE)
            return (
              <div key={item.id} className="flex items-center gap-1.5 min-w-0">
                <span className="w-16 sm:w-20 shrink-0 text-xs text-gray-700 dark:text-gray-300 truncate" title={item.name}>
                  {item.name}
                </span>
                <div className="min-w-0 flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(item.total / max) * 100}%`, backgroundColor: barColor }}
                  />
                </div>
                <span
                  className="min-w-0 w-20 sm:w-24 truncate text-right text-xs font-medium text-gray-800 dark:text-gray-200 tabular-nums"
                  title={`$${formatCurrency(item.total)}`}
                >
                  ${formatCurrency(item.total)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CategoryCharts({
  transactions,
  expenseCategories,
  incomeCategories,
}: CategoryChartsProps) {
  const expenseData = sumByCategory(transactions, 'expense', expenseCategories)
  const incomeData = sumByCategory(transactions, 'income', incomeCategories)

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Spending and income by category">
      <BarChart
        title="Expenses by category"
        items={expenseData}
        categories={expenseCategories}
        emptyMessage="No expenses this month"
      />
      <BarChart
        title="Income by category"
        items={incomeData}
        categories={incomeCategories}
        emptyMessage="No income this month"
      />
    </section>
  )
}
