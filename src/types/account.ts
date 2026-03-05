export interface Account {
  id: string
  user_id: string
  name: string
  initial_balance: number
  hide_balance?: boolean
  color?: string | null
  created_at: string
}

export interface AccountInsert {
  user_id: string
  name: string
  initial_balance?: number
  color?: string | null
}

export interface AccountUpdate {
  name?: string
  initial_balance?: number
  hide_balance?: boolean
  color?: string | null
}

export interface AccountWithBalance extends Account {
  balance: number
}
