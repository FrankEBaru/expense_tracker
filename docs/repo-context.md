# Repository Context

## Project Overview

A personal finance tracker built as a React SPA. Users can manage multiple accounts, categorize income and expenses, set budgets with flexible periods, and view analytics across a 12-month window. Data is persisted in Supabase (PostgreSQL) with per-user row-level security.

## Architecture

**React 18 + custom hooks + Supabase — no external state manager.**

- All data fetching and mutations live in `src/hooks/use*.ts` hooks that call Supabase directly.
- State is lifted to `App.tsx` and passed as props.
- View routing is manual: `App.tsx` holds a `view` state union (`'dashboard' | 'settings' | 'insights' | 'budgets'`) and conditionally renders the active component.
- No React Router, no Redux/Zustand/Context.

## Main Directories

| Path | Responsibility |
|---|---|
| `src/` | All application source |
| `src/lib/` | Supabase client singleton |
| `src/hooks/` | Data-fetching + CRUD hooks (one per domain) |
| `src/components/` | Feature components and reusable UI |
| `src/types/` | TypeScript interfaces mirroring DB schema |
| `src/utils/` | Pure helper functions (formatting, budget math) |
| `src/constants/` | Static config (color palettes, chart layout) |
| `supabase/` | SQL migration files (schema only, not run by app) |
| `docs/` | AI-agent documentation |

## Key Components

### Entry & Shell
- **`src/main.tsx`** — Mounts `<App />` into `#root`.
- **`src/App.tsx`** — Auth session management, theme (dark/light via `localStorage`), active view state, top-level accounts + categories fetch, floating "Add transaction" button, toast notifications.
- **`src/lib/supabase.ts`** — Creates and exports the single Supabase client; exports `isSupabaseConfigured` guard. Reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

### Hooks (data layer)
- **`useAccounts`** — Fetches accounts; computes live balances client-side (initial_balance + all transactions). Auto-creates "Default" account + default categories on first login.
- **`useCategories`** — Fetches categories filtered by `type` ('expense' | 'income'), ordered by `sort_order`.
- **`useTransactions`** — Fetches transactions for a selected month (`YYYY-MM`) with optional account filter (checks `account_id`, `from_account_id`, `to_account_id`).
- **`useTransactionsRange`** — Same as above but for an arbitrary date range; used by Insights and budget status.
- **`useBudgets`** — Fetches `budgets` + `budget_categories` join; resolves into `BudgetWithCategories` (includes `category_ids[]`).
- **`useBudgetPeriodTransactions`** — Prefetches a 3-month window; exposes `getTransactionsForPeriod(periodType, 'current'|'previous')` for in-memory filtering.

### Feature Components
- **`Auth.tsx`** — Email/password login and signup.
- **`Dashboard.tsx`** — Main view: accounts panel, budgets summary, month navigator, income/expense/net cards, CategoryCharts, transaction list with filters.
- **`TransactionForm.tsx`** — Modal for add/edit. Switches between expense/income (account + category) and transfer (from/to accounts) layouts.
- **`TransactionList.tsx`** — Transaction rows with context menu (edit/delete).
- **`Settings.tsx`** — CRUD for accounts and categories; color picker (palette + `<input type="color">`); blocks deletion if referenced by transactions.
- **`Budgets.tsx`** — Budget CRUD with progress bars (over-budget turns red), period badges, cumulative carry-over display.
- **`Insights.tsx`** — 12-month analytics: month-over-month summary, income/expense bar charts, per-category trends, expense share, net worth trend.
- **`CategoryCharts.tsx`** — Inline category breakdown bar charts used on Dashboard.
- **`CategoryFilterDropdown.tsx`** — Multi-select dropdown for filtering transactions by category (grouped by expense/income).
- **`VerticalBarChart.tsx`** — Generic reusable vertical bar chart (single-color or stacked) with tooltips.
- **`TrendLineChart.tsx`** — Generic SVG polyline trend chart, responsive via `ResizeObserver`, multi-series with tooltips.

### Utils & Constants
- **`utils/format.ts`** — `formatCurrency(value)` → locale string (no $ symbol).
- **`utils/budgetPeriods.ts`** — Date math: `getPeriodBounds`, `getPreviousPeriodBounds`, `computeBudgetStatus`, `getBudgetPeriodsRange`, `formatPeriodLabel`.
- **`constants/colors.ts`** — `ACCOUNT_PALETTE`, `EXPENSE_CATEGORY_PALETTE`, `INCOME_CATEGORY_PALETTE`; `getCategoryColor`, `getAccountColor` helpers.
- **`constants/chartConfig.ts`** — Centralized chart layout constants used by both chart components.

## Data Flow

```
Supabase DB (PostgreSQL + RLS)
       ↕  (supabase-js SDK)
src/lib/supabase.ts  (singleton client)
       ↕
src/hooks/use*.ts    (fetch + CRUD callbacks, local state)
       ↕
src/App.tsx          (auth, theme, view routing, top-level state)
       ↕  (props)
src/components/*.tsx (feature panels + modals)
       ↕  (props)
src/utils/ + src/constants/  (pure helpers, no side effects)
```

Account balances are **computed client-side** in `useAccounts`: `initial_balance` + sum of all transactions (income adds, expense subtracts, transfers move between accounts).

Budget status is **computed client-side** in `utils/budgetPeriods.ts:computeBudgetStatus` using prefetched transactions.

## External Integrations

| Service | Usage |
|---|---|
| **Supabase** | PostgreSQL database, Auth (email/password), Row Level Security |

No other external services, no server-side code. The app is a pure client-side SPA deployed via Vite build.

## Database Schema (summary)

| Table | Key columns |
|---|---|
| `accounts` | `id`, `user_id`, `name`, `initial_balance`, `hide_balance`, `color` |
| `categories` | `id`, `user_id`, `type` (expense\|income), `name`, `sort_order`, `color` |
| `transactions` | `id`, `user_id`, `type` (expense\|income\|transfer), `account_id`, `category_id`, `from_account_id`, `to_account_id`, `amount`, `date`, `description` |
| `budgets` | `id`, `user_id`, `name`, `period_type` (weekly\|biweekly\|monthly), `amount`, `cumulative` |
| `budget_categories` | `budget_id`, `category_id` (many-to-many) |

All tables have RLS policies scoped to `auth.uid() = user_id`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Language | TypeScript (strict) |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 (`darkMode: 'class'`) |
| Backend / DB | Supabase (supabase-js ^2.45) |
| Charts | Custom SVG components (no chart library) |
