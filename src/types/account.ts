export type AccountType = 'cash' | 'credit_card'

export function resolveAccountType(account: Pick<Account, 'account_type'> | null | undefined): AccountType {
  return account?.account_type === 'credit_card' ? 'credit_card' : 'cash'
}

/** Short suffix for credit accounts in selects and lists (tight UI). */
export function creditAccountSuffix(account: Pick<Account, 'account_type'> | null | undefined): string {
  return resolveAccountType(account) === 'credit_card' ? ' (Credit)' : ''
}

/** Account name + optional ` (Credit)` for dropdowns and labels. */
export function accountSelectLabel(account: Pick<Account, 'name' | 'account_type'>): string {
  return `${account.name}${creditAccountSuffix(account)}`
}

export interface Account {
  id: string
  user_id: string
  name: string
  initial_balance: number
  /** Defaults to `cash` when absent (pre-migration rows). */
  account_type?: AccountType
  hide_balance?: boolean
  color?: string | null
  created_at: string
}

export interface AccountInsert {
  name: string
  initial_balance?: number
  account_type?: AccountType
  color?: string | null
}

export interface AccountUpdate {
  name?: string
  initial_balance?: number
  account_type?: AccountType
  hide_balance?: boolean
  color?: string | null
}

export interface AccountWithBalance extends Account {
  balance: number
}
