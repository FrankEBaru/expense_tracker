import { useState, useMemo, useRef, useEffect } from 'react'
import { useTransactionsRange } from '../hooks/useTransactionsRange'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { getCategoryColor } from '../constants/colors'
import type { Transaction } from '../types/transaction'
import type { Category } from '../types/category'
import type { Account } from '../types/account'

function getMonthsBack(count: number): { ym: string; label: string; startDate: string; endDate: string }[] {
  const out: { ym: string; label: string; startDate: string; endDate: string }[] = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const ym = `${y}-${String(m).padStart(2, '0')}`
    const startDate = `${ym}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const endDate = `${ym}-${String(lastDay).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    out.push({ ym, label, startDate, endDate })
  }
  return out
}

function monthSummary(transactions: Transaction[], startDate: string, endDate: string) {
  let income = 0
  let expenses = 0
  for (const tx of transactions) {
    if (tx.date < startDate || tx.date > endDate) continue
    if (tx.type === 'income') income += Number(tx.amount)
    if (tx.type === 'expense') expenses += Number(tx.amount)
  }
  return { income, expenses, net: income - expenses }
}

function sumByCategory(
  transactions: Transaction[],
  type: 'expense' | 'income',
  categories: Category[],
  startDate?: string,
  endDate?: string
): { id: string; name: string; total: number }[] {
  const map = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type !== type || !tx.category_id) continue
    if (startDate && tx.date < startDate) continue
    if (endDate && tx.date > endDate) continue
    const current = map.get(tx.category_id) ?? 0
    map.set(tx.category_id, current + Number(tx.amount))
  }
  return categories
    .map((c) => ({ id: c.id, name: c.name, total: map.get(c.id) ?? 0 }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
}

function computeBalanceAtDate(
  accounts: Account[],
  transactions: Transaction[],
  upToDate: string
): Map<string, number> {
  const byAccount = new Map<string, number>()
  for (const acc of accounts) {
    byAccount.set(acc.id, Number(acc.initial_balance))
  }
  for (const tx of transactions) {
    if (tx.date > upToDate) continue
    if (tx.type === 'income' && tx.account_id) {
      byAccount.set(tx.account_id, (byAccount.get(tx.account_id) ?? 0) + Number(tx.amount))
    }
    if (tx.type === 'expense' && tx.account_id) {
      byAccount.set(tx.account_id, (byAccount.get(tx.account_id) ?? 0) - Number(tx.amount))
    }
    if (tx.type === 'transfer') {
      if (tx.from_account_id) byAccount.set(tx.from_account_id, (byAccount.get(tx.from_account_id) ?? 0) - Number(tx.amount))
      if (tx.to_account_id) byAccount.set(tx.to_account_id, (byAccount.get(tx.to_account_id) ?? 0) + Number(tx.amount))
    }
  }
  return byAccount
}

interface InsightsProps {
  onBack: () => void
}

export default function Insights({ onBack }: InsightsProps) {
  const monthsCount = 12
  const months = useMemo(() => getMonthsBack(monthsCount), [])
  const rangeStart = months[0].startDate
  const rangeEnd = months[months.length - 1].endDate

  const { transactions, loading, error } = useTransactionsRange(rangeStart, rangeEnd)
  const { accounts } = useAccounts()
  const { categories: expenseCategories } = useCategories('expense')
  const { categories: incomeCategories } = useCategories('income')

  const [expenseTopN, setExpenseTopN] = useState<number>(10)
  const [incomeTopN, setIncomeTopN] = useState<number>(10)
  const [expenseSelectedIds, setExpenseSelectedIds] = useState<string[]>([])
  const [incomeSelectedIds, setIncomeSelectedIds] = useState<string[]>([])
  const [shareMonth, setShareMonth] = useState<string>(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [hoveredNetWorthYm, setHoveredNetWorthYm] = useState<string | null>(null)

  const currentMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]
  const currentSummary = useMemo(
    () => monthSummary(transactions, currentMonth.startDate, currentMonth.endDate),
    [transactions, currentMonth]
  )
  const prevSummary = useMemo(
    () => (prevMonth ? monthSummary(transactions, prevMonth.startDate, prevMonth.endDate) : { income: 0, expenses: 0, net: 0 }),
    [transactions, prevMonth]
  )

  const incomeVsExpenseByMonth = useMemo(() => {
    return months.map((m) => {
      const s = monthSummary(transactions, m.startDate, m.endDate)
      return { ...m, income: s.income, expenses: s.expenses }
    })
  }, [months, transactions])

  const expenseTotalsByCategory = useMemo(
    () => sumByCategory(transactions, 'expense', expenseCategories),
    [transactions, expenseCategories]
  )
  const incomeTotalsByCategory = useMemo(
    () => sumByCategory(transactions, 'income', incomeCategories),
    [transactions, incomeCategories]
  )

  const expenseCategoryIdsToShow = useMemo(() => {
    if (expenseSelectedIds.length > 0) return expenseSelectedIds
    const top = expenseTotalsByCategory.slice(0, expenseTopN === 999 ? undefined : expenseTopN).map((c) => c.id)
    return top
  }, [expenseSelectedIds, expenseTotalsByCategory, expenseTopN])

  const incomeCategoryIdsToShow = useMemo(() => {
    if (incomeSelectedIds.length > 0) return incomeSelectedIds
    const top = incomeTotalsByCategory.slice(0, incomeTopN === 999 ? undefined : incomeTopN).map((c) => c.id)
    return top
  }, [incomeSelectedIds, incomeTotalsByCategory, incomeTopN])

  const expensesByCategoryOverTime = useMemo(() => {
    const categoryNames = new Map<string, string>()
    expenseCategories.forEach((c) => categoryNames.set(c.id, c.name))
    return months.map((m) => {
      const byCat = new Map<string, number>()
      for (const tx of transactions) {
        if (tx.type !== 'expense' || !tx.category_id || tx.date < m.startDate || tx.date > m.endDate) continue
        byCat.set(tx.category_id, (byCat.get(tx.category_id) ?? 0) + Number(tx.amount))
      }
      const series: { id: string; name: string; total: number }[] = expenseCategoryIdsToShow
        .map((id) => ({ id, name: categoryNames.get(id) ?? id, total: byCat.get(id) ?? 0 }))
        .filter((s) => s.total > 0)
      return { ...m, series }
    })
  }, [months, transactions, expenseCategories, expenseCategoryIdsToShow])

  const incomeByCategoryOverTime = useMemo(() => {
    const categoryNames = new Map<string, string>()
    incomeCategories.forEach((c) => categoryNames.set(c.id, c.name))
    return months.map((m) => {
      const byCat = new Map<string, number>()
      for (const tx of transactions) {
        if (tx.type !== 'income' || !tx.category_id || tx.date < m.startDate || tx.date > m.endDate) continue
        byCat.set(tx.category_id, (byCat.get(tx.category_id) ?? 0) + Number(tx.amount))
      }
      const series: { id: string; name: string; total: number }[] = incomeCategoryIdsToShow
        .map((id) => ({ id, name: categoryNames.get(id) ?? id, total: byCat.get(id) ?? 0 }))
        .filter((s) => s.total > 0)
      return { ...m, series }
    })
  }, [months, transactions, incomeCategories, incomeCategoryIdsToShow])

  const shareMonthBounds = useMemo(() => {
    const [y, m] = shareMonth.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0)
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    }
  }, [shareMonth])

  const categoryShareData = useMemo(() => {
    const list = sumByCategory(transactions, 'expense', expenseCategories, shareMonthBounds.start, shareMonthBounds.end)
    const total = list.reduce((s, i) => s + i.total, 0)
    if (total === 0) return []
    return list.map((i) => ({ ...i, share: (i.total / total) * 100 }))
  }, [transactions, expenseCategories, shareMonthBounds])

  const netWorthByMonth = useMemo(() => {
    return months.map((m) => {
      const balances = computeBalanceAtDate(accounts, transactions, m.endDate)
      const total = [...balances.values()].reduce((a, b) => a + b, 0)
      return { ...m, netWorth: total }
    })
  }, [months, accounts, transactions])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading insights…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600 dark:text-red-400 text-sm">Failed to load: {error}</p>
        <button type="button" onClick={onBack} className="mt-2 text-sm text-blue-600 dark:text-blue-400">
          ← Back to dashboard
        </button>
      </div>
    )
  }

  const maxIncomeExpense = Math.max(
    1,
    ...incomeVsExpenseByMonth.flatMap((m) => [m.income, m.expenses])
  )
  const netWorthValues = netWorthByMonth.map((m) => m.netWorth)
  const minNetWorth = netWorthValues.length ? Math.min(...netWorthValues) : 0
  const maxNetWorth = netWorthValues.length ? Math.max(...netWorthValues) : 1
  const netWorthRange = maxNetWorth - minNetWorth

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ← Dashboard
        </button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Insights</h2>
        <span className="w-16" />
      </div>

      {/* 1. Trend summary */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">This month vs last month</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Income</p>
            <p className="font-medium text-green-700 dark:text-green-400">${currentSummary.income.toFixed(2)}</p>
            {prevMonth && (
              <p className="text-xs text-gray-500">
                {prevSummary.income === 0
                  ? '—'
                  : `${currentSummary.income >= prevSummary.income ? '+' : ''}${(currentSummary.income - prevSummary.income).toFixed(2)} vs last`}
              </p>
            )}
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Expenses</p>
            <p className="font-medium text-red-700 dark:text-red-400">${currentSummary.expenses.toFixed(2)}</p>
            {prevMonth && (
              <p className="text-xs text-gray-500">
                {prevSummary.expenses === 0
                  ? '—'
                  : `${currentSummary.expenses >= prevSummary.expenses ? '+' : ''}${(currentSummary.expenses - prevSummary.expenses).toFixed(2)} vs last`}
              </p>
            )}
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Net</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">${currentSummary.net.toFixed(2)}</p>
            {prevMonth && (
              <p className="text-xs text-gray-500">
                {prevSummary.net === 0
                  ? '—'
                  : `${currentSummary.net >= prevSummary.net ? '+' : ''}${(currentSummary.net - prevSummary.net).toFixed(2)} vs last`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 2. Income vs expenses by month */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Income vs expenses by month</h3>
        {incomeVsExpenseByMonth.every((m) => m.income === 0 && m.expenses === 0) ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No data for this period.</p>
        ) : (
          <div className="space-y-2 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {incomeVsExpenseByMonth.map((m) => (
                <div key={m.ym} className="flex flex-col items-center w-14 shrink-0">
                  <div className="w-full flex flex-col gap-0.5 h-24 justify-end">
                    <div
                      className="w-full bg-green-500 dark:bg-green-600 rounded-t min-h-[2px]"
                      style={{ height: `${(m.income / maxIncomeExpense) * 100}%` }}
                      title={`Income: $${m.income.toFixed(2)}`}
                    />
                    <div
                      className="w-full bg-red-500 dark:bg-red-600 rounded-t min-h-[2px]"
                      style={{ height: `${(m.expenses / maxIncomeExpense) * 100}%` }}
                      title={`Expenses: $${m.expenses.toFixed(2)}`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate max-w-full">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" /> Income</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> Expenses</span>
            </div>
          </div>
        )}
      </section>

      {/* 3. Expenses by category over time */}
      <CategoryOverTimeSection
        title="Expenses by category over time"
        months={months}
        data={expensesByCategoryOverTime}
        categoryTotals={expenseTotalsByCategory}
        topN={expenseTopN}
        setTopN={setExpenseTopN}
        selectedIds={expenseSelectedIds}
        onSelectedIdsChange={setExpenseSelectedIds}
        categories={expenseCategories}
        emptyMessage="No expense data for this period."
      />

      {/* 4. Income by category over time */}
      <CategoryOverTimeSection
        title="Income by category over time"
        months={months}
        data={incomeByCategoryOverTime}
        categoryTotals={incomeTotalsByCategory}
        topN={incomeTopN}
        setTopN={setIncomeTopN}
        selectedIds={incomeSelectedIds}
        onSelectedIdsChange={setIncomeSelectedIds}
        categories={incomeCategories}
        emptyMessage="No income data for this period."
      />

      {/* 5. Category share (one month) */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expense share by category</h3>
        <div className="mb-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">Month </label>
          <select
            value={shareMonth}
            onChange={(e) => setShareMonth(e.target.value)}
            className="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200"
          >
            {months.map((m) => (
              <option key={m.ym} value={m.ym}>{m.label}</option>
            ))}
          </select>
        </div>
        {categoryShareData.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No data for this period.</p>
        ) : (
          <div className="space-y-1.5">
            {categoryShareData.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-1.5 min-w-0">
                <span className="w-20 shrink-0 text-xs text-gray-700 dark:text-gray-300 truncate" title={item.name}>{item.name}</span>
                <div className="min-w-0 flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{ width: `${item.share}%`, backgroundColor: getCategoryColor(item.id, expenseCategories, idx) }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs text-gray-600 dark:text-gray-400">{item.share.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6a. Net worth over time – Trend */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Net worth over time – Trend</h3>
        {netWorthByMonth.every((m) => m.netWorth === 0) ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <NetWorthLineChart data={netWorthByMonth} />
          </div>
        )}
      </section>

      {/* 6b. Net worth over time – By month */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Net worth over time – By month</h3>
        {netWorthByMonth.every((m) => m.netWorth === 0) ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto min-w-0 relative">
            {hoveredNetWorthYm && (() => {
              const m = netWorthByMonth.find((d) => d.ym === hoveredNetWorthYm)
              if (!m) return null
              return (
                <div className="absolute z-10 left-1/2 top-0 -translate-x-1/2 px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg text-xs pointer-events-none">
                  <p className="font-medium text-gray-700 dark:text-gray-300">{m.label}</p>
                  <p className="tabular-nums text-gray-800 dark:text-gray-200">${m.netWorth.toFixed(2)}</p>
                </div>
              )
            })()}
            <div className="flex gap-1 min-w-max items-end h-20">
              {netWorthByMonth.map((m) => (
                <div
                  key={m.ym}
                  className="flex flex-col items-center w-14 shrink-0"
                  onMouseEnter={() => setHoveredNetWorthYm(m.ym)}
                  onMouseLeave={() => setHoveredNetWorthYm(null)}
                >
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t min-h-[4px]"
                    style={{ height: `${netWorthRange === 0 ? 100 : ((m.netWorth - minNetWorth) / netWorthRange) * 100}%` }}
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate max-w-full">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function CategoryOverTimeLineChart({
  months,
  categoryIds,
  categories,
  maxVal,
}: {
  months: { ym: string; label: string; series: { id: string; name: string; total: number }[] }[]
  categoryIds: string[]
  categories: Category[]
  maxVal: number
}) {
  const [hoverMonthIndex, setHoverMonthIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const padding = { top: 12, right: 12, bottom: 28, left: 44 }
  const width = Math.max(280, months.length * 28)
  const height = 120
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const range = maxVal || 1
  const yTicks = 5
  const tickValues: number[] = []
  for (let i = 0; i <= yTicks; i++) {
    tickValues.push((i / yTicks) * maxVal)
  }
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]))

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el || months.length === 0) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const fraction = rect.width > 0 ? x / rect.width : 0
    const index = Math.min(months.length - 1, Math.max(0, Math.floor(fraction * months.length)))
    setHoverMonthIndex(index)
  }

  const handleMouseLeave = () => setHoverMonthIndex(null)

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[120px] block" preserveAspectRatio="none">
        {/* Grid lines */}
        {tickValues.slice(1, -1).map((v, i) => {
          const y = padding.top + (1 - v / range) * innerHeight
          return (
            <line
              key={i}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          )
        })}
        {months.length > 1 &&
          months.slice(1, -1).map((_, i) => {
            const x = padding.left + ((i + 1) / (months.length - 1)) * innerWidth
            return (
              <line
                key={i}
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="2,2"
                strokeWidth="1"
              />
            )
          })}
        {/* Y-axis labels */}
        {tickValues.map((v, i) => {
          const y = padding.top + (1 - v / range) * innerHeight
          return (
            <text
              key={i}
              x={padding.left - 6}
              y={y + 4}
              textAnchor="end"
              className="fill-gray-500 dark:fill-gray-400 text-[10px]"
              fontSize={10}
            >
              ${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
            </text>
          )
        })}
        {/* Lines */}
        {categoryIds.map((catId, idx) => {
          const points = months
            .map((m, i) => {
              const total = m.series.find((s) => s.id === catId)?.total ?? 0
              const x = padding.left + (i / Math.max(1, months.length - 1)) * innerWidth
              const y = padding.top + (1 - total / range) * innerHeight
              return `${x},${y}`
            })
            .join(' ')
          const color = getCategoryColor(catId, categories, idx)
          const name = categoryNames.get(catId) ?? catId
          return (
            <polyline
              key={catId}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              data-category-id={catId}
              data-category-name={name}
            >
              <title>{name}</title>
            </polyline>
          )
        })}
        {/* X-axis month labels */}
        {months.map((m, i) => {
          const x = padding.left + (i / Math.max(1, months.length - 1)) * innerWidth
          return (
            <text
              key={m.ym}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={9}
            >
              {m.label}
            </text>
          )
        })}
      </svg>
      {/* Hover tooltip */}
      {hoverMonthIndex !== null && months[hoverMonthIndex] && (
        <div
          className="absolute z-10 px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg text-xs text-gray-800 dark:text-gray-200 pointer-events-none max-w-[200px]"
          style={{
            left: '50%',
            top: 8,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1.5 border-b border-gray-100 dark:border-gray-600 pb-1">
            {months[hoverMonthIndex].label}
          </p>
          <ul className="space-y-1">
            {categoryIds
              .map((catId, idx) => {
                const name = categoryNames.get(catId) ?? catId
                const total = months[hoverMonthIndex].series.find((s) => s.id === catId)?.total ?? 0
                return { catId, name, total, color: getCategoryColor(catId, categories, idx) }
              })
              .filter((row) => row.total > 0)
              .map((row) => (
                <li key={row.catId} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="truncate min-w-0">{row.name}</span>
                  <span className="tabular-nums shrink-0">${row.total.toFixed(2)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-600 dark:text-gray-400">
        {categoryIds.map((catId, idx) => {
          const name = categoryNames.get(catId) ?? catId
          const color = getCategoryColor(catId, categories, idx)
          return (
            <span key={catId} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="truncate max-w-[120px]" title={name}>{name}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function NetWorthLineChart({ data }: { data: { ym: string; label: string; netWorth: number }[] }) {
  const padding = { top: 12, right: 12, bottom: 28, left: 44 }
  const width = Math.max(280, data.length * 28)
  const height = 120
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const minVal = Math.min(...data.map((d) => d.netWorth))
  const maxVal = Math.max(...data.map((d) => d.netWorth))
  const range = maxVal - minVal || 1
  const yTicks = 5
  const tickValues: number[] = []
  for (let i = 0; i <= yTicks; i++) {
    tickValues.push(minVal + (i / yTicks) * (maxVal - minVal))
  }
  const points = data
    .map((d, i) => {
      const x = padding.left + (i / Math.max(1, data.length - 1)) * innerWidth
      const y = padding.top + (1 - (d.netWorth - minVal) / range) * innerHeight
      return `${x},${y}`
    })
    .join(' ')
  const formatTick = (v: number) =>
    v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[120px] block" preserveAspectRatio="none">
      {/* Grid */}
      {tickValues.slice(1, -1).map((v, i) => {
        const y = padding.top + (1 - (v - minVal) / range) * innerHeight
        return (
          <line
            key={i}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeDasharray="2,2"
            strokeWidth="1"
          />
        )
      })}
      {data.length > 1 &&
        data.slice(1, -1).map((_, i) => {
          const x = padding.left + ((i + 1) / (data.length - 1)) * innerWidth
          return (
            <line
              key={i}
              x1={x}
              y1={padding.top}
              x2={x}
              y2={height - padding.bottom}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          )
        })}
      {/* Y-axis labels */}
      {tickValues.map((v, i) => {
        const y = padding.top + (1 - (v - minVal) / range) * innerHeight
        return (
          <text
            key={i}
            x={padding.left - 6}
            y={y + 4}
            textAnchor="end"
            className="fill-gray-500 dark:fill-gray-400 text-[10px]"
            fontSize={10}
          >
            ${formatTick(v)}
          </text>
        )
      })}
      <polyline
        fill="none"
        stroke="rgb(59, 130, 246)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
        {/* X-axis month labels */}
        {data.map((d, i) => {
          const x = padding.left + (i / Math.max(1, data.length - 1)) * innerWidth
          return (
            <text
              key={d.ym}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={9}
            >
              {d.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function CategoryOverTimeSection({
  title,
  months,
  data,
  categoryTotals,
  topN,
  setTopN,
  selectedIds,
  onSelectedIdsChange,
  categories,
  emptyMessage,
}: {
  title: string
  months: { ym: string; label: string }[]
  data: { ym: string; label: string; series: { id: string; name: string; total: number }[] }[]
  categoryTotals: { id: string; name: string; total: number }[]
  topN: number
  setTopN: (n: number) => void
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  categories: Category[]
  emptyMessage: string
}) {
  const categoryIdsInData = useMemo(() => {
    const ids = new Set<string>()
    data.forEach((m) => m.series.forEach((s) => ids.add(s.id)))
    return [...ids]
  }, [data])
  const [openDropdown, setOpenDropdown] = useState(false)
  const [hoveredBarYm, setHoveredBarYm] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasData = data.some((m) => m.series.length > 0)
  const maxVal = hasData
    ? Math.max(1, ...data.flatMap((m) => m.series.map((s) => s.total)))
    : 1

  const controls = (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">Show:</span>
      <select
        value={topN}
        onChange={(e) => setTopN(Number(e.target.value))}
        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-800 dark:text-gray-200"
      >
        <option value={5}>Top 5</option>
        <option value={10}>Top 10</option>
        <option value={15}>Top 15</option>
        <option value={999}>All</option>
      </select>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpenDropdown((o) => !o)}
          className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200"
        >
          {selectedIds.length === 0 ? 'Select categories' : `${selectedIds.length} selected`} ▼
        </button>
        {openDropdown && (
          <div className="absolute left-0 top-full mt-1 z-20 w-48 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 py-1">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => {
                    if (selectedIds.includes(c.id)) {
                      onSelectedIdsChange(selectedIds.filter((x) => x !== c.id))
                    } else {
                      onSelectedIdsChange([...selectedIds, c.id])
                    }
                  }}
                  className="rounded"
                />
                <span className="text-xs truncate">{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Section 1: Trend (time series) */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title} – Trend</h3>
        {controls}
        {!hasData ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <CategoryOverTimeLineChart
              months={data}
              categoryIds={categoryIdsInData}
              categories={categories}
              maxVal={maxVal}
            />
          </div>
        )}
      </section>

      {/* Section 2: By month (stacked bars) */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title} – By month</h3>
        {!hasData ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto min-w-0 relative">
            {hoveredBarYm && (() => {
              const m = data.find((d) => d.ym === hoveredBarYm)
              if (!m) return null
              return (
                <div className="absolute z-10 left-1/2 top-0 -translate-x-1/2 px-2.5 py-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg text-xs pointer-events-none">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-1 border-b border-gray-100 dark:border-gray-600 pb-1">
                    {m.label}
                  </p>
                  <ul className="space-y-0.5">
                    {m.series.map((s, i) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getCategoryColor(s.id, categories, i) }}
                        />
                        <span className="truncate">{s.name}:</span>
                        <span className="tabular-nums">${s.total.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}
            <div className="flex gap-1 min-w-max">
              {data.map((m) => (
                <div
                  key={m.ym}
                  className="w-14 shrink-0 flex flex-col gap-0.5"
                  onMouseEnter={() => setHoveredBarYm(m.ym)}
                  onMouseLeave={() => setHoveredBarYm(null)}
                >
                  {m.series.length === 0 ? (
                    <div className="h-16" />
                  ) : (
                    <div className="flex flex-col gap-0.5 justify-end h-16">
                      {m.series.map((s, i) => (
                        <div
                          key={s.id}
                          className="rounded-sm min-h-[2px]"
                          style={{
                            height: `${(s.total / maxVal) * 100}%`,
                            backgroundColor: getCategoryColor(s.id, categories, i),
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  )
}
