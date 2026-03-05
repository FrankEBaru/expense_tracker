# Feature Map

## Core Features

1. **Authentication** — Email/password sign up and login via Supabase Auth.
2. **Account Management** — Multiple named accounts with initial balances, optional color, hide-balance toggle.
3. **Category Management** — Separate expense and income categories with custom colors and sort order.
4. **Transaction Tracking** — Add/edit/delete expense, income, and transfer transactions with date, amount, category, account, and description.
5. **Budget Management** — Named budgets with weekly, biweekly, or monthly periods; optional cumulative carry-over; linked to multiple categories.
6. **Dashboard** — Month navigator, account balances, mini budget summary, income/expense/net totals, category bar charts, filtered transaction list.
7. **Insights / Analytics** — 12-month income vs expenses, per-category trends, expense share breakdown, net worth over time.
8. **Settings** — Manage accounts and categories (CRUD with color pickers).
9. **Dark / Light Theme** — Persisted to `localStorage`, toggled from the header.

## Feature → Files Mapping

### Authentication
- `src/components/Auth.tsx`
- `src/lib/supabase.ts`
- `src/App.tsx` (session management via `supabase.auth.getSession` + `onAuthStateChange`)

### Account Management
- `src/components/Settings.tsx` (account CRUD UI)
- `src/hooks/useAccounts.ts` (fetch, CRUD, balance computation, first-login defaults)
- `src/types/account.ts`
- `src/constants/colors.ts` (`ACCOUNT_PALETTE`, `getAccountColor`)

### Category Management
- `src/components/Settings.tsx` (category CRUD UI)
- `src/hooks/useCategories.ts` (fetch, CRUD)
- `src/types/category.ts`
- `src/constants/colors.ts` (`EXPENSE_CATEGORY_PALETTE`, `INCOME_CATEGORY_PALETTE`, `getCategoryColor`)

### Transaction Tracking
- `src/components/TransactionForm.tsx` (add/edit modal)
- `src/components/TransactionList.tsx` (list + delete/edit menu)
- `src/hooks/useTransactions.ts` (fetch by month + account, CRUD)
- `src/hooks/useTransactionsRange.ts` (fetch by date range)
- `src/types/transaction.ts`
- `src/utils/format.ts` (`formatCurrency`)
- `src/App.tsx` (floating add button, form open/close state)

### Budget Management
- `src/components/Budgets.tsx` (budget list + CRUD modal)
- `src/hooks/useBudgets.ts` (fetch budgets + budget_categories, CRUD)
- `src/hooks/useBudgetPeriodTransactions.ts` (prefetch transactions for budget period window)
- `src/utils/budgetPeriods.ts` (period bounds, status computation, labels)
- `src/types/budget.ts`

### Dashboard
- `src/components/Dashboard.tsx` (main layout + account panel + summary cards)
- `src/components/CategoryCharts.tsx` (inline category bar charts)
- `src/components/TransactionList.tsx`
- `src/components/CategoryFilterDropdown.tsx`
- `src/hooks/useTransactions.ts`
- `src/hooks/useAccounts.ts`
- `src/hooks/useBudgets.ts` + `useBudgetPeriodTransactions.ts` (budget summary panel)

### Insights / Analytics
- `src/components/Insights.tsx`
- `src/components/VerticalBarChart.tsx`
- `src/components/TrendLineChart.tsx`
- `src/hooks/useTransactionsRange.ts` (12-month window)
- `src/hooks/useAccounts.ts` (net worth computation)
- `src/constants/chartConfig.ts`
- `src/constants/colors.ts`

### Settings
- `src/components/Settings.tsx`
- `src/hooks/useAccounts.ts`
- `src/hooks/useCategories.ts`

### Theme
- `src/App.tsx` (toggle handler, `localStorage` persistence, `dark` class on `<html>`)
- `tailwind.config.js` (`darkMode: 'class'`)

## Main User Flows

### Sign Up / Login
1. App loads → `App.tsx` checks Supabase session.
2. No session → render `<Auth>`.
3. User submits credentials → `supabase.auth.signUp` or `signInWithPassword`.
4. On success → session triggers `onAuthStateChange` → App renders main UI.
5. `useAccounts` detects no accounts → auto-creates "Default" account + default categories.

### Add a Transaction
1. User clicks floating "+" button (dashboard) or "Add Transaction" header button.
2. `TransactionForm` modal opens (type defaults to expense).
3. User selects type (expense / income / transfer), fills amount, date, account, category (or from/to accounts for transfer), optional description.
4. Submit → `addTransaction` in `useTransactions` → Supabase insert → refetch → modal closes → toast shown.

### Edit / Delete a Transaction
1. In `TransactionList`, user taps "⋮" on a row → context menu appears.
2. **Edit**: opens `TransactionForm` pre-filled → on submit calls `updateTransaction`.
3. **Delete**: calls `deleteTransaction` directly → refetch.

### Manage Accounts / Categories
1. Navigate to Settings view.
2. Add: click "Add Account / Category" → inline modal form.
3. Edit: "⋮" → Edit → modal pre-filled → submit calls `updateAccount` / `updateCategory`.
4. Delete: "⋮" → Delete → blocked with error toast if the account/category has associated transactions.

### Create / Edit a Budget
1. Navigate to Budgets view.
2. Click "Add Budget" → modal with name, period type, amount, cumulative toggle, category checkboxes.
3. Submit → `addBudget` + `setBudgetCategories`.
4. Budget list shows progress bar; over-budget turns red. Cumulative budgets show carried-over amount from previous period.

### View Insights
1. Navigate to Insights view.
2. `useTransactionsRange` fetches last 12 months of transactions (all accounts).
3. Page renders month-over-month summary, grouped bar charts, trend lines, and expense-share horizontal bars.
4. User can toggle Top N categories or select a specific category per chart section.
