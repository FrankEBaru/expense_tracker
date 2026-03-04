import { useState, useMemo, useRef, useEffect } from 'react'
import { useTransactionsRange } from '../hooks/useTransactionsRange'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { getCategoryColor } from '../constants/colors'
import { CHART, CHART_TOOLTIP_CLASS, CHART_TOOLTIP_TITLE_CLASS, CHART_TOOLTIP_BODY_CLASS } from '../constants/chartConfig'
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
  const [expenseTopNByMonth, setExpenseTopNByMonth] = useState<number>(10)
  const [incomeTopNByMonth, setIncomeTopNByMonth] = useState<number>(10)
  const [expenseSelectedIdsByMonth, setExpenseSelectedIdsByMonth] = useState<string[]>([])
  const [incomeSelectedIdsByMonth, setIncomeSelectedIdsByMonth] = useState<string[]>([])
  const [shareMonth, setShareMonth] = useState<string>(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [hoveredNetWorthYm, setHoveredNetWorthYm] = useState<string | null>(null)
  const [hoveredIncomeExpenseYm, setHoveredIncomeExpenseYm] = useState<string | null>(null)

  useEffect(() => {
    if (!hoveredIncomeExpenseYm) return
    const onDocClick = () => {
      setHoveredIncomeExpenseYm(null)
      document.removeEventListener('click', onDocClick)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [hoveredIncomeExpenseYm])

  useEffect(() => {
    if (!hoveredNetWorthYm) return
    const onDocClick = () => {
      setHoveredNetWorthYm(null)
      document.removeEventListener('click', onDocClick)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [hoveredNetWorthYm])

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

  const expenseCategoryIdsToShowByMonth = useMemo(() => {
    if (expenseSelectedIdsByMonth.length > 0) return expenseSelectedIdsByMonth
    const top = expenseTotalsByCategory.slice(0, expenseTopNByMonth === 999 ? undefined : expenseTopNByMonth).map((c) => c.id)
    return top
  }, [expenseSelectedIdsByMonth, expenseTotalsByCategory, expenseTopNByMonth])

  const incomeCategoryIdsToShowByMonth = useMemo(() => {
    if (incomeSelectedIdsByMonth.length > 0) return incomeSelectedIdsByMonth
    const top = incomeTotalsByCategory.slice(0, incomeTopNByMonth === 999 ? undefined : incomeTopNByMonth).map((c) => c.id)
    return top
  }, [incomeSelectedIdsByMonth, incomeTotalsByCategory, incomeTopNByMonth])

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

  const expensesByCategoryOverTimeByMonth = useMemo(() => {
    const categoryNames = new Map<string, string>()
    expenseCategories.forEach((c) => categoryNames.set(c.id, c.name))
    return months.map((m) => {
      const byCat = new Map<string, number>()
      for (const tx of transactions) {
        if (tx.type !== 'expense' || !tx.category_id || tx.date < m.startDate || tx.date > m.endDate) continue
        byCat.set(tx.category_id, (byCat.get(tx.category_id) ?? 0) + Number(tx.amount))
      }
      const series: { id: string; name: string; total: number }[] = expenseCategoryIdsToShowByMonth
        .map((id) => ({ id, name: categoryNames.get(id) ?? id, total: byCat.get(id) ?? 0 }))
        .filter((s) => s.total > 0)
      return { ...m, series }
    })
  }, [months, transactions, expenseCategories, expenseCategoryIdsToShowByMonth])

  const incomeByCategoryOverTimeByMonth = useMemo(() => {
    const categoryNames = new Map<string, string>()
    incomeCategories.forEach((c) => categoryNames.set(c.id, c.name))
    return months.map((m) => {
      const byCat = new Map<string, number>()
      for (const tx of transactions) {
        if (tx.type !== 'income' || !tx.category_id || tx.date < m.startDate || tx.date > m.endDate) continue
        byCat.set(tx.category_id, (byCat.get(tx.category_id) ?? 0) + Number(tx.amount))
      }
      const series: { id: string; name: string; total: number }[] = incomeCategoryIdsToShowByMonth
        .map((id) => ({ id, name: categoryNames.get(id) ?? id, total: byCat.get(id) ?? 0 }))
        .filter((s) => s.total > 0)
      return { ...m, series }
    })
  }, [months, transactions, incomeCategories, incomeCategoryIdsToShowByMonth])

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
          <div className="relative space-y-2">
            {hoveredIncomeExpenseYm && (() => {
              const m = incomeVsExpenseByMonth.find((d) => d.ym === hoveredIncomeExpenseYm)
              const idx = incomeVsExpenseByMonth.findIndex((d) => d.ym === hoveredIncomeExpenseYm)
              if (!m || idx < 0) return null
              const leftPct = ((idx + 0.5) / incomeVsExpenseByMonth.length) * 100
              return (
                <div
                  className={CHART_TOOLTIP_CLASS}
                  style={{ left: `${leftPct}%`, top: 0, transform: 'translateX(-50%)' }}
                >
                  <p className={CHART_TOOLTIP_TITLE_CLASS}>{m.label}</p>
                  <p className="tabular-nums">Income: ${m.income.toFixed(2)}</p>
                  <p className="tabular-nums">Expenses: ${m.expenses.toFixed(2)}</p>
                </div>
              )
            })()}
            <div className="flex w-full gap-1">
              {incomeVsExpenseByMonth.map((m) => (
                <div
                  key={m.ym}
                  className="flex min-w-0 flex-1 flex-col items-center"
                  onMouseEnter={() => setHoveredIncomeExpenseYm(m.ym)}
                  onMouseLeave={() => setHoveredIncomeExpenseYm(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setHoveredIncomeExpenseYm(m.ym)
                  }}
                >
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
        trendData={expensesByCategoryOverTime}
        byMonthData={expensesByCategoryOverTimeByMonth}
        trendTopN={expenseTopN}
        setTrendTopN={setExpenseTopN}
        trendSelectedIds={expenseSelectedIds}
        onTrendSelectedIdsChange={setExpenseSelectedIds}
        byMonthTopN={expenseTopNByMonth}
        setByMonthTopN={setExpenseTopNByMonth}
        byMonthSelectedIds={expenseSelectedIdsByMonth}
        onByMonthSelectedIdsChange={setExpenseSelectedIdsByMonth}
        categories={expenseCategories}
        emptyMessage="No expense data for this period."
      />

      {/* 4. Income by category over time */}
      <CategoryOverTimeSection
        title="Income by category over time"
        months={months}
        trendData={incomeByCategoryOverTime}
        byMonthData={incomeByCategoryOverTimeByMonth}
        trendTopN={incomeTopN}
        setTrendTopN={setIncomeTopN}
        trendSelectedIds={incomeSelectedIds}
        onTrendSelectedIdsChange={setIncomeSelectedIds}
        byMonthTopN={incomeTopNByMonth}
        setByMonthTopN={setIncomeTopNByMonth}
        byMonthSelectedIds={incomeSelectedIdsByMonth}
        onByMonthSelectedIdsChange={setIncomeSelectedIdsByMonth}
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
          <div className="min-w-0 w-full" style={{ marginTop: CHART.section.chartMarginTop }}>
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
          <div
            className="relative min-w-0 w-full"
            style={{
              minHeight: CHART.barChart.barHeight + CHART.barChart.tooltipReserveHeight + 24,
              marginTop: CHART.section.chartMarginTop,
            }}
          >
            {hoveredNetWorthYm && (() => {
              const m = netWorthByMonth.find((d) => d.ym === hoveredNetWorthYm)
              const idx = netWorthByMonth.findIndex((d) => d.ym === hoveredNetWorthYm)
              if (!m || idx < 0) return null
              const leftPct = ((idx + 0.5) / netWorthByMonth.length) * 100
              return (
                <div
                  className={CHART_TOOLTIP_CLASS}
                  style={{ left: `${leftPct}%`, top: 0, transform: 'translateX(-50%)' }}
                >
                  <p className={CHART_TOOLTIP_TITLE_CLASS}>{m.label}</p>
                  <p className="tabular-nums font-medium">${m.netWorth.toFixed(2)}</p>
                </div>
              )
            })()}
            <div
              className="flex w-full gap-1 items-end"
              style={{ marginTop: CHART.barChart.tooltipReserveHeight, height: CHART.barChart.barHeight, gap: CHART.barChart.gap }}
            >
              {netWorthByMonth.map((m) => (
                <div
                  key={m.ym}
                  className="flex min-w-0 flex-1 flex-col items-center"
                  onMouseEnter={() => setHoveredNetWorthYm(m.ym)}
                  onMouseLeave={() => setHoveredNetWorthYm(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setHoveredNetWorthYm(m.ym)
                  }}
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
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { height, padding, minWidth, widthPerPoint, yTicks: yTicksCount, fontSize } = CHART.lineChart
  const width = Math.max(minWidth, months.length * widthPerPoint)
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const range = maxVal || 1
  const tickValues: number[] = []
  for (let i = 0; i <= yTicksCount; i++) {
    tickValues.push((i / yTicksCount) * maxVal)
  }
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]))
  const showEveryNthLabel = months.length > 10 ? 2 : 1
  const activeIndex = pinnedIndex ?? hoverMonthIndex

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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const el = containerRef.current
    if (!el || months.length === 0) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const fraction = rect.width > 0 ? x / rect.width : 0
    const index = Math.min(months.length - 1, Math.max(0, Math.floor(fraction * months.length)))
    setPinnedIndex(index)
  }

  useEffect(() => {
    if (pinnedIndex === null) return
    const onDocClick = () => {
      setPinnedIndex(null)
      document.removeEventListener('click', onDocClick)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [pinnedIndex])

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-0"
      style={{ minHeight: height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full block"
        style={{ height, minHeight: height, maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
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
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={fontSize.axis}
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
        {/* X-axis month labels – show every Nth to avoid overlap */}
        {months.map((m, i) => {
          if (i % showEveryNthLabel !== 0) return null
          const x = padding.left + (i / Math.max(1, months.length - 1)) * innerWidth
          return (
            <text
              key={m.ym}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={fontSize.label}
            >
              {m.label}
            </text>
          )
        })}
      </svg>
      {/* Hover / tap tooltip */}
      {activeIndex !== null && months[activeIndex] && (
        <div
          className={CHART_TOOLTIP_CLASS}
          style={{ left: '50%', top: 8, transform: 'translateX(-50%)', maxWidth: 220 }}
        >
          <p className={CHART_TOOLTIP_TITLE_CLASS}>{months[activeIndex].label}</p>
          <ul className={CHART_TOOLTIP_BODY_CLASS}>
            {categoryIds
              .map((catId, idx) => {
                const name = categoryNames.get(catId) ?? catId
                const total = months[activeIndex].series.find((s) => s.id === catId)?.total ?? 0
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { height, padding, minWidth, widthPerPoint, yTicks: yTicksCount, fontSize } = CHART.lineChart
  const width = Math.max(minWidth, data.length * widthPerPoint)
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const minVal = Math.min(...data.map((d) => d.netWorth))
  const maxVal = Math.max(...data.map((d) => d.netWorth))
  const range = maxVal - minVal || 1
  const tickValues: number[] = []
  for (let i = 0; i <= yTicksCount; i++) {
    tickValues.push(minVal + (i / yTicksCount) * (maxVal - minVal))
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
  const showEveryNthLabel = data.length > 10 ? 2 : 1
  const activeIndex = pinnedIndex ?? hoverIndex

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el || data.length === 0) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const fraction = rect.width > 0 ? x / rect.width : 0
    const index = Math.min(data.length - 1, Math.max(0, Math.floor(fraction * data.length)))
    setHoverIndex(index)
  }
  const handleMouseLeave = () => setHoverIndex(null)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const el = containerRef.current
    if (!el || data.length === 0) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const fraction = rect.width > 0 ? x / rect.width : 0
    const index = Math.min(data.length - 1, Math.max(0, Math.floor(fraction * data.length)))
    setPinnedIndex(index)
  }

  useEffect(() => {
    if (pinnedIndex === null) return
    const onDocClick = () => {
      setPinnedIndex(null)
      document.removeEventListener('click', onDocClick)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [pinnedIndex])

  return (
    <div
      className="relative w-full min-h-0"
      style={{ minHeight: height }}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full block"
        style={{ height, minHeight: height, maxWidth: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
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
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={fontSize.axis}
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
          if (i % showEveryNthLabel !== 0) return null
          const x = padding.left + (i / Math.max(1, data.length - 1)) * innerWidth
          return (
            <text
              key={d.ym}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize={fontSize.label}
            >
              {d.label}
            </text>
          )
        })}
      </svg>
      {/* Hover / tap tooltip */}
      {activeIndex !== null && data[activeIndex] && (
        <div
          className={CHART_TOOLTIP_CLASS}
          style={{ left: '50%', top: 8, transform: 'translateX(-50%)' }}
        >
          <p className={CHART_TOOLTIP_TITLE_CLASS}>{data[activeIndex].label}</p>
          <p className="tabular-nums font-medium">${data[activeIndex].netWorth.toFixed(2)}</p>
        </div>
      )}
    </div>
  )
}

function CategoryControlRow({
  topN,
  setTopN,
  selectedIds,
  onSelectedIdsChange,
  categories,
  dropdownRef,
  openDropdown,
  setOpenDropdown,
}: {
  topN: number
  setTopN: (n: number) => void
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  categories: Category[]
  dropdownRef: React.RefObject<HTMLDivElement | null>
  openDropdown: boolean
  setOpenDropdown: (v: boolean | ((prev: boolean) => boolean)) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">Show:</span>
      <select
        value={topN}
        onChange={(e) => setTopN(Number(e.target.value))}
        className="min-h-[44px] px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-800 dark:text-gray-200"
      >
        <option value={5}>Top 5</option>
        <option value={10}>Top 10</option>
        <option value={15}>Top 15</option>
        <option value={999}>All</option>
      </select>
      <div className="relative" ref={dropdownRef as React.RefObject<HTMLDivElement>}>
        <button
          type="button"
          onClick={() => setOpenDropdown((o: boolean) => !o)}
          className="min-h-[44px] px-2 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-200"
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
}

function CategoryOverTimeSection({
  title,
  months: _months,
  trendData,
  byMonthData,
  trendTopN,
  setTrendTopN,
  trendSelectedIds,
  onTrendSelectedIdsChange,
  byMonthTopN,
  setByMonthTopN,
  byMonthSelectedIds,
  onByMonthSelectedIdsChange,
  categories,
  emptyMessage,
}: {
  title: string
  months: { ym: string; label: string }[]
  trendData: { ym: string; label: string; series: { id: string; name: string; total: number }[] }[]
  byMonthData: { ym: string; label: string; series: { id: string; name: string; total: number }[] }[]
  trendTopN: number
  setTrendTopN: (n: number) => void
  trendSelectedIds: string[]
  onTrendSelectedIdsChange: (ids: string[]) => void
  byMonthTopN: number
  setByMonthTopN: (n: number) => void
  byMonthSelectedIds: string[]
  onByMonthSelectedIdsChange: (ids: string[]) => void
  categories: Category[]
  emptyMessage: string
}) {
  const trendCategoryIds = useMemo(() => {
    const ids = new Set<string>()
    trendData.forEach((m) => m.series.forEach((s) => ids.add(s.id)))
    return [...ids]
  }, [trendData])
  const [trendDropdownOpen, setTrendDropdownOpen] = useState(false)
  const [byMonthDropdownOpen, setByMonthDropdownOpen] = useState(false)
  const trendDropdownRef = useRef<HTMLDivElement>(null)
  const byMonthDropdownRef = useRef<HTMLDivElement>(null)
  const [hoveredBarYm, setHoveredBarYm] = useState<string | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (trendDropdownRef.current && !trendDropdownRef.current.contains(e.target as Node)) setTrendDropdownOpen(false)
      if (byMonthDropdownRef.current && !byMonthDropdownRef.current.contains(e.target as Node)) setByMonthDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!hoveredBarYm) return
    const onDocClick = () => {
      setHoveredBarYm(null)
      document.removeEventListener('click', onDocClick)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [hoveredBarYm])

  const hasTrendData = trendData.some((m) => m.series.length > 0)
  const hasByMonthData = byMonthData.some((m) => m.series.length > 0)
  const trendMaxVal = hasTrendData ? Math.max(1, ...trendData.flatMap((m) => m.series.map((s) => s.total))) : 1
  const byMonthMaxVal = hasByMonthData ? Math.max(1, ...byMonthData.flatMap((m) => m.series.map((s) => s.total))) : 1
  const { barChart } = CHART
  const byMonthChartHeight =
    barChart.tooltipReserveHeight +
    barChart.barHeight +
    barChart.monthLabelHeight +
    8 /* gap before legend */ +
    barChart.legendRowHeight

  const byMonthLegendCategories = useMemo(() => {
    const ids: string[] = []
    const seen = new Set<string>()
    byMonthData.forEach((m) =>
      m.series.forEach((s) => {
        if (!seen.has(s.id)) {
          seen.add(s.id)
          ids.push(s.id)
        }
      })
    )
    return ids
  }, [byMonthData])

  return (
    <>
      {/* Section 1: Trend (time series) – own controls */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title} – Trend</h3>
        <CategoryControlRow
          topN={trendTopN}
          setTopN={setTrendTopN}
          selectedIds={trendSelectedIds}
          onSelectedIdsChange={onTrendSelectedIdsChange}
          categories={categories}
          dropdownRef={trendDropdownRef}
          openDropdown={trendDropdownOpen}
          setOpenDropdown={setTrendDropdownOpen}
        />
        {!hasTrendData ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="min-w-0 w-full" style={{ marginTop: CHART.section.chartMarginTop }}>
            <CategoryOverTimeLineChart
              months={trendData}
              categoryIds={trendCategoryIds}
              categories={categories}
              maxVal={trendMaxVal}
            />
          </div>
        )}
      </section>

      {/* Section 2: By month (stacked bars) – own controls */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title} – By month</h3>
        <CategoryControlRow
          topN={byMonthTopN}
          setTopN={setByMonthTopN}
          selectedIds={byMonthSelectedIds}
          onSelectedIdsChange={onByMonthSelectedIdsChange}
          categories={categories}
          dropdownRef={byMonthDropdownRef}
          openDropdown={byMonthDropdownOpen}
          setOpenDropdown={setByMonthDropdownOpen}
        />
        {!hasByMonthData ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">{emptyMessage}</p>
        ) : (
          <div
            className="relative min-w-0 w-full overflow-y-hidden"
            style={{
              height: byMonthChartHeight,
              marginTop: CHART.section.chartMarginTop,
              paddingLeft: barChart.horizontalPadding,
              paddingRight: barChart.horizontalPadding,
            }}
          >
            <div className="relative flex w-full flex-col">
              {/* Tooltip: anchored above hovered bar (percentage-based for flexible bars) */}
              {hoveredBarYm && (() => {
                const m = byMonthData.find((d) => d.ym === hoveredBarYm)
                const hoveredIndex = byMonthData.findIndex((d) => d.ym === hoveredBarYm)
                if (!m || hoveredIndex < 0) return null
                const leftPct = ((hoveredIndex + 0.5) / byMonthData.length) * 100
                return (
                  <div
                    className={CHART_TOOLTIP_CLASS}
                    style={{
                      left: `${leftPct}%`,
                      top: 0,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <p className={CHART_TOOLTIP_TITLE_CLASS}>{m.label}</p>
                    <ul className={CHART_TOOLTIP_BODY_CLASS}>
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
              {/* Bars row */}
              <div
                className="flex w-full shrink-0"
                style={{ marginTop: barChart.tooltipReserveHeight, gap: barChart.gap }}
              >
                {byMonthData.map((m) => (
                  <div
                    key={m.ym}
                    className="flex min-w-0 flex-1 flex-col gap-0.5"
                    onMouseEnter={() => setHoveredBarYm(m.ym)}
                    onMouseLeave={() => setHoveredBarYm(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setHoveredBarYm(m.ym)
                    }}
                  >
                    {m.series.length === 0 ? (
                      <div style={{ height: barChart.barHeight }} />
                    ) : (
                      <div
                        className="flex flex-col gap-0.5 justify-end"
                        style={{ height: barChart.barHeight }}
                      >
                        {m.series.map((s, i) => (
                          <div
                            key={s.id}
                            className="rounded-sm min-h-[2px]"
                            style={{
                              height: `${(s.total / byMonthMaxVal) * 100}%`,
                              backgroundColor: getCategoryColor(s.id, categories, i),
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">{m.label}</span>
                  </div>
                ))}
              </div>
              {/* Category legend (below month labels) */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-600 dark:text-gray-400 shrink-0 min-h-0">
                {byMonthLegendCategories.map((catId, idx) => {
                  const name = categories.find((c) => c.id === catId)?.name ?? catId
                  const color = getCategoryColor(catId, categories, idx)
                  return (
                    <span key={catId} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="truncate max-w-[120px]" title={name}>
                        {name}
                      </span>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
