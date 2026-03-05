export type TransactionType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  account_id: string | null
  category_id: string | null
  from_account_id: string | null
  to_account_id: string | null
  amount: number
  date: string
  description: string | null
  created_at: string
}

export interface TransactionWithDetails extends Transaction {
  category?: { name: string } | null
  account?: { name: string } | null
  from_account?: { name: string } | null
  to_account?: { name: string } | null
}

export interface TransactionInsert {
  type: TransactionType
  account_id?: string | null
  category_id?: string | null
  from_account_id?: string | null
  to_account_id?: string | null
  amount: number
  date: string
  description?: string | null
}

export interface TransactionUpdate {
  account_id?: string | null
  category_id?: string | null
  from_account_id?: string | null
  to_account_id?: string | null
  amount?: number
  date?: string
  description?: string | null
}
