import type { Account, AccountWithBalance } from '../types/account'
import type { Transaction } from '../types/transaction'

/** Ledger balance: income increases, expense decreases, transfers move between accounts. */
export function applyTransactionToBalanceMap(
  byAccount: Map<string, number>,
  tx: Transaction
): void {
  if (tx.type === 'income' && tx.account_id) {
    byAccount.set(tx.account_id, (byAccount.get(tx.account_id) ?? 0) + Number(tx.amount))
  }
  if (tx.type === 'expense' && tx.account_id) {
    byAccount.set(tx.account_id, (byAccount.get(tx.account_id) ?? 0) - Number(tx.amount))
  }
  if (tx.type === 'transfer') {
    if (tx.from_account_id) {
      byAccount.set(tx.from_account_id, (byAccount.get(tx.from_account_id) ?? 0) - Number(tx.amount))
    }
    if (tx.to_account_id) {
      byAccount.set(tx.to_account_id, (byAccount.get(tx.to_account_id) ?? 0) + Number(tx.amount))
    }
  }
}

export function computeBalancesFromTransactions(
  accounts: Account[],
  transactions: Transaction[]
): AccountWithBalance[] {
  return accounts.map((acc) => {
    let balance = Number(acc.initial_balance)
    for (const t of transactions) {
      if (t.type === 'income' && t.account_id === acc.id) balance += Number(t.amount)
      if (t.type === 'expense' && t.account_id === acc.id) balance -= Number(t.amount)
      if (t.type === 'transfer') {
        if (t.to_account_id === acc.id) balance += Number(t.amount)
        if (t.from_account_id === acc.id) balance -= Number(t.amount)
      }
    }
    return { ...acc, balance }
  })
}

/** Balances after applying all transactions with date <= upToDate (inclusive). */
export function computeBalanceMapUpToDate(
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
    applyTransactionToBalanceMap(byAccount, tx)
  }
  return byAccount
}
