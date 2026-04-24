import { useState, useRef, useEffect } from 'react'
import type { Category } from '../types/category'

interface CategoryFilterDropdownProps {
  expenseCategories: Category[]
  incomeCategories: Category[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export default function CategoryFilterDropdown({
  expenseCategories,
  incomeCategories,
  selectedIds,
  onChange,
}: CategoryFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const label =
    selectedIds.length === 0
      ? 'All categories'
      : selectedIds.length === 1
        ? '1 category'
        : `${selectedIds.length} categories`

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ui-btn ui-btn-secondary"
        style={{ minHeight: 40, padding: '8px 10px', textTransform: 'none', letterSpacing: 0 }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {label}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-20 w-64 max-h-72 overflow-y-auto ui-card"
          style={{ padding: 8 }}
          role="listbox"
        >
          <div className="pb-2 mb-2 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-softer)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Filter by category</span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="ui-btn ui-btn-ghost"
                style={{ minHeight: 30, padding: '6px 8px', textTransform: 'none', letterSpacing: 0 }}
              >
                Clear
              </button>
            )}
          </div>
          <div>
            {expenseCategories.length > 0 && (
              <p className="text-xs font-medium mt-1 mb-1" style={{ color: 'var(--text-secondary)' }}>Expense</p>
            )}
            {expenseCategories.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 py-2 cursor-pointer ui-card-inner"
                style={{ borderRadius: 14 }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  className="rounded"
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
              </label>
            ))}
            {incomeCategories.length > 0 && (
              <p className="text-xs font-medium mt-3 mb-1" style={{ color: 'var(--text-secondary)' }}>Income</p>
            )}
            {incomeCategories.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 py-2 cursor-pointer ui-card-inner"
                style={{ borderRadius: 14 }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  className="rounded"
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
