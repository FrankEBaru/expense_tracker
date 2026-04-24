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
    <div className="ui-card min-w-0" style={{ padding: 'var(--space-card)' }}>
      <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }} className="truncate">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emptyMessage}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, idx) => {
            const barColor = getCategoryColor(item.id, categories, idx, EXPENSE_CATEGORY_PALETTE)
            return (
              <div key={item.id} className="flex items-center gap-1.5 min-w-0">
                <span className="w-16 sm:w-20 shrink-0 text-xs truncate" style={{ color: 'var(--text-primary)' }} title={item.name}>
                  {item.name}
                </span>
                <div className="min-w-0 flex-1 h-4 rounded overflow-hidden" style={{ background: 'rgba(17,17,17,0.08)' }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${(item.total / max) * 100}%`, backgroundColor: barColor }}
                  />
                </div>
                <span
                  className="min-w-0 w-20 sm:w-24 truncate text-right text-xs font-medium tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
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
