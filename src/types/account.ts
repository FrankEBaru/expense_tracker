export interface Account {
  id: string
  user_id: string
  name: string
  initial_balance: number
  hide_balance?: boolean
  created_at: string
}

export interface AccountInsert {
  user_id: string
  name: string
  initial_balance?: number
}

export interface AccountUpdate {
  name?: string
  initial_balance?: number
  hide_balance?: boolean
}

export interface AccountWithBalance extends Account {
  balance: number
}
