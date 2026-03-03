export type ExpenseCategory = 'Food' | 'Transport' | 'Bills' | 'Shopping' | 'Other'

export const CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Other',
]

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: ExpenseCategory
  description: string | null
  date: string
  created_at: string
}

export interface ExpenseInsert {
  user_id: string
  amount: number
  category: ExpenseCategory
  description?: string | null
  date: string
}

export interface ExpenseUpdate {
  amount?: number
  category?: ExpenseCategory
  description?: string | null
  date?: string
}
