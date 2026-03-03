import { useExpenses } from '../hooks/useExpenses'

interface MonthTotalProps {
  selectedMonth: string
  onMonthChange: (ym: string) => void
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function MonthTotal({ selectedMonth, onMonthChange }: MonthTotalProps) {
  const { expenses, loading } = useExpenses(selectedMonth)

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    onMonthChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    onMonthChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const now = new Date()
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const isCurrentMonth = selectedMonth === currentYm

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
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
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <p className="text-lg font-semibold text-gray-800">
          Total for {formatMonthLabel(selectedMonth)}: ${total.toFixed(2)}
        </p>
      )}
    </div>
  )
}
