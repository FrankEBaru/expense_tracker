import { useState, useRef, useEffect } from 'react'
import type { Transaction } from '../types/transaction'
import type { Account } from '../types/account'
import type { Category } from '../types/category'
import { formatCurrency } from '../utils/format'
import {
  EXPENSE_CATEGORY_PALETTE,
  INCOME_CATEGORY_PALETTE,
  getAccountColor,
  getCategoryColor,
} from '../constants/colors'

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
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 'Invalid date'
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

function getFallbackTxColor(index: number) {
  const palette = ['var(--tx-1)', 'var(--tx-2)', 'var(--tx-3)', 'var(--tx-4)'] as const
  return palette[index % palette.length]
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
  const [openMenuTxId, setOpenMenuTxId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (openMenuTxId === null) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuTxId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuTxId])

  if (error) {
    return (
      <div className="ui-card p-4">
        <p className="text-sm" style={{ color: 'var(--text-negative)' }}>
          Failed to load transactions: {error}
        </p>
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading transactions…</p>
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: 'var(--text-secondary)' }}>
        No transactions to show. Try changing the filter or month, or add a transaction.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {transactions.map((tx, idx) => {
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

        const accentColor = (() => {
          if (tx.type === 'expense' && tx.category_id) {
            return getCategoryColor(tx.category_id, expenseCategories, idx, EXPENSE_CATEGORY_PALETTE)
          }
          if (tx.type === 'income' && tx.category_id) {
            return getCategoryColor(tx.category_id, incomeCategories, idx, INCOME_CATEGORY_PALETTE)
          }
          if (!isTransfer && tx.account_id) {
            const acc = accounts.find((a) => a.id === tx.account_id)
            if (acc) return getAccountColor(acc, idx)
          }
          if (isTransfer && tx.from_account_id) {
            const acc = accounts.find((a) => a.id === tx.from_account_id)
            if (acc) return getAccountColor(acc, idx)
          }
          return getFallbackTxColor(idx)
        })()

        const amountColor = isExpense ? 'var(--text-negative)' : isTransfer ? 'var(--text-primary)' : 'var(--text-positive)'
        const typeLabel = isTransfer ? 'transfer' : isExpense ? 'expense' : 'income'

        return (
          <li
            key={tx.id}
            className="ui-card"
            style={{
              padding: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 40,
                height: 40,
                background: accentColor,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                {isTransfer ? (
                  <path
                    d="M3 5h8M11 5l-2-2M11 11H3m0 0l2 2"
                    stroke="white"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : isExpense ? (
                  <path
                    d="M11 5L5 11M5 11h4.8M5 11V6.2"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M5 11l6-6M11 5H6.2M11 5v4.8"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {label}
                </span>
                <span className="ui-badge shrink-0" style={{ background: 'var(--color-bg-secondary)', color: 'var(--text-secondary)' }}>
                  {typeLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(tx.date)}
                </span>
                {tx.description && (
                  <>
                    <span aria-hidden className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      •
                    </span>
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {tx.description}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div style={{ fontSize: 15, fontWeight: 900, color: amountColor, fontVariantNumeric: 'tabular-nums' }}>
                {isExpense ? '-' : ''}${formatCurrency(amount)}
              </div>
              <div className="relative mt-1 flex justify-end" ref={openMenuTxId === tx.id ? menuRef : undefined}>
                <button
                  type="button"
                  onClick={() => setOpenMenuTxId(openMenuTxId === tx.id ? null : tx.id)}
                  className="ui-btn ui-btn-ghost"
                  style={{ minHeight: 36, width: 40, padding: 0, textTransform: 'none', letterSpacing: 0 }}
                  aria-label="Actions"
                  aria-expanded={openMenuTxId === tx.id}
                >
                  ⋮
                </button>
                {openMenuTxId === tx.id && (
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[8rem] ui-card" style={{ padding: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(tx)
                        setOpenMenuTxId(null)
                      }}
                      className="w-full text-left ui-btn ui-btn-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        minHeight: 40,
                        padding: '10px 10px',
                        textTransform: 'none',
                        letterSpacing: 0,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(tx.id)
                        setOpenMenuTxId(null)
                      }}
                      className="w-full text-left ui-btn ui-btn-ghost"
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        minHeight: 40,
                        padding: '10px 10px',
                        textTransform: 'none',
                        letterSpacing: 0,
                        color: 'var(--text-negative)',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
