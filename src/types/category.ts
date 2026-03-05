export type CategoryType = 'expense' | 'income'

export interface Category {
  id: string
  user_id: string
  type: CategoryType
  name: string
  sort_order: number
  color?: string | null
  created_at: string
}

export interface CategoryInsert {
  type: CategoryType
  name: string
  sort_order?: number
  color?: string | null
}

export interface CategoryUpdate {
  name?: string
  sort_order?: number
  color?: string | null
}
