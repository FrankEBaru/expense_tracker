import { useState, useMemo, useRef, useEffect } from 'react'
import { useTransactionsRange } from '../hooks/useTransactionsRange'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { getCategoryColor, EXPENSE_CATEGORY_PALETTE, INCOME_CATEGORY_PALETTE, type ColorPalette } from '../constants/colors'
import { CHART, CHART_TOOLTIP_BODY_CLASS } from '../constants/chartConfig'
import { formatCurrency } from '../utils/format'
import { VerticalBarChart } from './VerticalBarChart'
import { TrendLineChart } from './TrendLineChart'
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
        <p style={{ color: 'var(--text-secondary)' }}>Loading insights…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="ui-card p-4">
          <p className="text-sm" style={{ color: 'var(--text-negative)' }}>Failed to load: {error}</p>
        </div>
        <button type="button" onClick={onBack} className="ui-btn ui-btn-ghost" style={{ marginTop: 10, minHeight: 36, padding: '8px 10px', textTransform: 'none', letterSpacing: 0 }}>
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
          className="ui-btn ui-btn-ghost"
          style={{ minHeight: 36, padding: '8px 10px', textTransform: 'none', letterSpacing: 0 }}
        >
          ← Dashboard
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Insights</h2>
        <span className="w-16" />
      </div>

      {/* 1. Trend summary */}
      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          This month vs last month
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Income</p>
            <p className="font-medium" style={{ color: 'var(--text-positive)', fontVariantNumeric: 'tabular-nums' }}>${formatCurrency(currentSummary.income)}</p>
            {prevMonth && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {prevSummary.income === 0
                  ? '—'
                  : `${currentSummary.income >= prevSummary.income ? '+' : ''}${formatCurrency(currentSummary.income - prevSummary.income)} vs last`}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Expenses</p>
            <p className="font-medium" style={{ color: 'var(--text-negative)', fontVariantNumeric: 'tabular-nums' }}>${formatCurrency(currentSummary.expenses)}</p>
            {prevMonth && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {prevSummary.expenses === 0
                  ? '—'
                  : `${currentSummary.expenses >= prevSummary.expenses ? '+' : ''}${formatCurrency(currentSummary.expenses - prevSummary.expenses)} vs last`}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Net</p>
            <p className="font-medium" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>${formatCurrency(currentSummary.net)}</p>
            {prevMonth && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {prevSummary.net === 0
                  ? '—'
                  : `${currentSummary.net >= prevSummary.net ? '+' : ''}${formatCurrency(currentSummary.net - prevSummary.net)} vs last`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 2. Income vs expenses by month */}
      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Income vs expenses by month
        </h3>
        <VerticalBarChart
          data={incomeVsExpenseByMonth}
          hasData={!incomeVsExpenseByMonth.every((m) => m.income === 0 && m.expenses === 0)}
          emptyMessage="No data for this period."
          getSegments={(m) => [
            {
              heightPct: maxIncomeExpense > 0 ? (m.income / maxIncomeExpense) * 100 : 0,
              color: 'rgb(34, 197, 94)',
            },
            {
              heightPct: maxIncomeExpense > 0 ? (m.expenses / maxIncomeExpense) * 100 : 0,
              color: 'rgb(239, 68, 68)',
            },
          ]}
          legendItems={[
            { id: 'income', name: 'Income', color: 'rgb(34, 197, 94)' },
            { id: 'expenses', name: 'Expenses', color: 'rgb(239, 68, 68)' },
          ]}
          renderTooltip={(m) => (
            <ul className={CHART_TOOLTIP_BODY_CLASS}>
              <li key="income" className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: 'rgb(34, 197, 94)' }}
                />
                <span className="truncate">Income:</span>
                <span className="tabular-nums">${formatCurrency(m.income)}</span>
              </li>
              <li key="expenses" className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: 'rgb(239, 68, 68)' }}
                />
                <span className="truncate">Expenses:</span>
                <span className="tabular-nums">${formatCurrency(m.expenses)}</span>
              </li>
            </ul>
          )}
        />
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
        palette={EXPENSE_CATEGORY_PALETTE}
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
        palette={INCOME_CATEGORY_PALETTE}
        emptyMessage="No income data for this period."
      />

      {/* 5. Category share (one month) */}
      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Expense share by category
        </h3>
        <div className="mb-2">
          <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Month </label>
          <select
            value={shareMonth}
            onChange={(e) => setShareMonth(e.target.value)}
            className="ui-select"
            style={{ display: 'inline-block', width: 'auto', marginLeft: 8, minHeight: 36, paddingTop: 6, paddingBottom: 6 }}
          >
            {months.map((m) => (
              <option key={m.ym} value={m.ym}>{m.label}</option>
            ))}
          </select>
        </div>
        {categoryShareData.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No data for this period.</p>
        ) : (
          <div className="space-y-1.5">
            {categoryShareData.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-1.5 min-w-0">
                <span className="w-20 shrink-0 text-xs truncate" style={{ color: 'var(--text-primary)' }} title={item.name}>{item.name}</span>
                <div className="min-w-0 flex-1 h-4 rounded overflow-hidden" style={{ background: 'rgba(17,17,17,0.08)' }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${item.share}%`, backgroundColor: getCategoryColor(item.id, expenseCategories, idx, EXPENSE_CATEGORY_PALETTE) }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{item.share.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6a. Net worth over time – Trend */}
      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Net worth over time – Trend
        </h3>
        {netWorthByMonth.every((m) => m.netWorth === 0) ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No data for this period.</p>
        ) : (
          <div className="min-w-0 w-full" style={{ marginTop: CHART.section.chartMarginTop }}>
            <NetWorthLineChart data={netWorthByMonth} />
          </div>
        )}
      </section>

      {/* 6b. Net worth over time – By month */}
      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Net worth over time – By month
        </h3>
        <VerticalBarChart
          data={netWorthByMonth}
          hasData={!netWorthByMonth.every((m) => m.netWorth === 0)}
          emptyMessage="No data for this period."
          getSegments={(m) => {
            const barPct = netWorthRange === 0 ? 100 : ((m.netWorth - minNetWorth) / netWorthRange) * 100
            return [{ heightPct: barPct, color: 'rgb(59, 130, 246)' }]
          }}
          renderTooltip={(m) => <p className="tabular-nums font-medium">${formatCurrency(m.netWorth)}</p>}
        />
      </section>
    </div>
  )
}

function CategoryOverTimeLineChart({
  months,
  categoryIds,
  categories,
  maxVal,
  palette,
}: {
  months: { ym: string; label: string; series: { id: string; name: string; total: number }[] }[]
  categoryIds: string[]
  categories: Category[]
  maxVal: number
  palette: ColorPalette
}) {
  const series = useMemo(
    () =>
      categoryIds.map((catId, idx) => ({
        id: catId,
        name: categories.find((c) => c.id === catId)?.name ?? catId,
        color: getCategoryColor(catId, categories, idx, palette),
        values: months.map((m) => m.series.find((s) => s.id === catId)?.total ?? 0),
      })),
    [categoryIds, categories, months, palette]
  )
  const data = useMemo(() => months.map((m) => ({ ym: m.ym, label: m.label })), [months])
  return (
    <TrendLineChart
      data={data}
      series={series}
      yMin={0}
      yMax={maxVal || 1}
      formatYTick={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))}
      renderTooltip={(monthIndex) => (
        <ul className={CHART_TOOLTIP_BODY_CLASS}>
          {categoryIds
            .map((catId, idx) => {
              const name = categories.find((c) => c.id === catId)?.name ?? catId
              const total = months[monthIndex].series.find((s) => s.id === catId)?.total ?? 0
              return { catId, name, total, color: getCategoryColor(catId, categories, idx, palette) }
            })
            .filter((row) => row.total > 0)
            .map((row) => (
              <li key={row.catId} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                <span className="truncate min-w-0">{row.name}</span>
                <span className="tabular-nums shrink-0">${formatCurrency(row.total)}</span>
              </li>
            ))}
        </ul>
      )}
      showLegend
    />
  )
}

function NetWorthLineChart({ data }: { data: { ym: string; label: string; netWorth: number }[] }) {
  const minVal = useMemo(() => (data.length ? Math.min(...data.map((d) => d.netWorth)) : 0), [data])
  const maxVal = useMemo(() => (data.length ? Math.max(...data.map((d) => d.netWorth)) : 1), [data])
  const series = useMemo(
    () => [
      {
        id: 'net',
        name: 'Net worth',
        color: 'rgb(59, 130, 246)',
        values: data.map((d) => d.netWorth),
      },
    ],
    [data]
  )
  const chartData = useMemo(() => data.map((d) => ({ ym: d.ym, label: d.label })), [data])
  return (
    <TrendLineChart
      data={chartData}
      series={series}
      yMin={minVal}
      yMax={maxVal}
      formatYTick={(v) => (v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))}
      renderTooltip={(monthIndex) => (
        <p className="tabular-nums font-medium">${formatCurrency(data[monthIndex].netWorth)}</p>
      )}
    />
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
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Show:</span>
      <select
        value={topN}
        onChange={(e) => setTopN(Number(e.target.value))}
        className="ui-select"
        style={{ width: 'auto', minHeight: 40, paddingTop: 8, paddingBottom: 8, fontSize: 12 }}
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
          className="ui-btn ui-btn-secondary"
          style={{ minHeight: 40, padding: '8px 10px', textTransform: 'none', letterSpacing: 0 }}
        >
          {selectedIds.length === 0 ? 'Select categories' : `${selectedIds.length} selected`} ▼
        </button>
        {openDropdown && (
          <div className="absolute left-0 top-full mt-1 z-20 w-56 max-h-56 overflow-y-auto ui-card" style={{ padding: 6 }}>
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-2 py-2 cursor-pointer ui-card-inner" style={{ borderRadius: 14 }}>
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
                <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
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
  months,
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
  palette,
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
  palette: ColorPalette
  emptyMessage: string
}) {
  void months
  const trendCategoryIds = useMemo(() => {
    const ids = new Set<string>()
    trendData.forEach((m) => m.series.forEach((s) => ids.add(s.id)))
    return [...ids]
  }, [trendData])
  const [trendDropdownOpen, setTrendDropdownOpen] = useState(false)
  const [byMonthDropdownOpen, setByMonthDropdownOpen] = useState(false)
  const trendDropdownRef = useRef<HTMLDivElement>(null)
  const byMonthDropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (trendDropdownRef.current && !trendDropdownRef.current.contains(e.target as Node)) setTrendDropdownOpen(false)
      if (byMonthDropdownRef.current && !byMonthDropdownRef.current.contains(e.target as Node)) setByMonthDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasTrendData = trendData.some((m) => m.series.length > 0)
  const hasByMonthData = byMonthData.some((m) => m.series.length > 0)
  const trendMaxVal = hasTrendData ? Math.max(1, ...trendData.flatMap((m) => m.series.map((s) => s.total))) : 1
  const byMonthMaxVal = hasByMonthData ? Math.max(1, ...byMonthData.flatMap((m) => m.series.map((s) => s.total))) : 1

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
      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          {title} – Trend
        </h3>
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
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emptyMessage}</p>
        ) : (
          <div className="min-w-0 w-full" style={{ marginTop: CHART.section.chartMarginTop }}>
            <CategoryOverTimeLineChart
              months={trendData}
              categoryIds={trendCategoryIds}
              categories={categories}
              maxVal={trendMaxVal}
              palette={palette}
            />
          </div>
        )}
      </section>

      {/* Section 2: By month (stacked bars) – own controls */}
      <section className="ui-card" style={{ padding: 'var(--space-card)' }}>
        <h3 style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
          {title} – By month
        </h3>
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
        <VerticalBarChart
          data={byMonthData}
          hasData={hasByMonthData}
          emptyMessage={emptyMessage}
          getSegments={(m) =>
            m.series.map((s, i) => ({
              heightPct: byMonthMaxVal > 0 ? (s.total / byMonthMaxVal) * 100 : 0,
              color: getCategoryColor(s.id, categories, i, palette),
              label: s.name,
            }))
          }
          legendItems={byMonthLegendCategories.map((catId, idx) => ({
            id: catId,
            name: categories.find((c) => c.id === catId)?.name ?? catId,
            color: getCategoryColor(catId, categories, idx, palette),
          }))}
          renderTooltip={(m) => (
            <ul className={CHART_TOOLTIP_BODY_CLASS}>
              {m.series.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(s.id, categories, i, palette) }}
                  />
                  <span className="truncate min-w-0" title={s.name}>{s.name}:</span>
                  <span className="tabular-nums shrink-0">${formatCurrency(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        />
      </section>
    </>
  )
}
