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
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {label}
        <span className="text-gray-400" aria-hidden>▼</span>
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-20 w-56 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
          role="listbox"
        >
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter by category</span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="p-2">
            {expenseCategories.length > 0 && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 mb-1">Expense</p>
            )}
            {expenseCategories.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  className="rounded border-gray-300 dark:border-gray-500"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
              </label>
            ))}
            {incomeCategories.length > 0 && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1">Income</p>
            )}
            {incomeCategories.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  className="rounded border-gray-300 dark:border-gray-500"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
