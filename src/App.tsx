import { useEffect, useState, useCallback, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Insights from './components/Insights'
import Settings from './components/Settings'
import Budgets from './components/Budgets'
import ResetPassword from './components/ResetPassword'
import TransactionForm from './components/TransactionForm'
import { useAccounts } from './hooks/useAccounts'
import { useCategories } from './hooks/useCategories'
import type { Transaction } from './types/transaction'
import type { TransactionInsert } from './types/transaction'
import type { TransactionUpdate } from './types/transaction'
import PillNav, { type NavItemId } from './components/ui/PillNav'
import { IconLogout, IconPlus } from './components/ui/icons'

type View = 'dashboard' | 'settings' | 'insights' | 'budgets' | 'resetPassword'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [txMutations, setTxMutations] = useState<{
    addTransaction: (insert: TransactionInsert) => Promise<void>
    updateTransaction: (id: string, update: TransactionUpdate) => Promise<void>
  } | null>(null)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('theme')
    if (stored === 'light') return false
    if (stored === 'dark') return true
    return true
  })
  const [toast, setToast] = useState<{ message: string } | null>(null)

  const showToast = useCallback((message: string) => {
    setToast({ message })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggleTheme = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  const { accounts, loading: accountsLoading, error: accountsError, refetch: refetchAccounts } = useAccounts()
  const { categories: expenseCategories, refetch: refetchExpenseCategories } = useCategories('expense')
  const { categories: incomeCategories, refetch: refetchIncomeCategories } = useCategories('income')

  useEffect(() => {
    if (session) refetchAccounts()
  }, [session, refetchAccounts])

  const prevViewRef = useRef<View>(view)
  useEffect(() => {
    if ((prevViewRef.current === 'settings' || prevViewRef.current === 'insights' || prevViewRef.current === 'budgets') && view === 'dashboard') {
      refetchAccounts()
      refetchExpenseCategories()
      refetchIncomeCategories()
    }
    prevViewRef.current = view
  }, [view, refetchAccounts, refetchExpenseCategories, refetchIncomeCategories])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') {
        setView('resetPassword')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const openAddForm = useCallback(() => {
    setEditingTransaction(null)
    setShowForm(true)
  }, [])

  const openEditForm = useCallback((tx: Transaction) => {
    setEditingTransaction(tx)
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditingTransaction(null)
  }, [])

  const handleTransactionSaved = useCallback(() => {
    refetchAccounts()
    closeForm()
  }, [refetchAccounts, closeForm])

  const closeSettings = useCallback(() => setView('dashboard'), [])
  const closeInsights = useCallback(() => setView('dashboard'), [])
  const openBudgets = useCallback(() => setView('budgets'), [])
  const closeBudgets = useCallback(() => setView('dashboard'), [])

  const navItems = useRef([
    {
      id: 'dashboard' as const,
      label: 'Home',
      colorVar: 'var(--color-green)' as const,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 7.2L8 3l5 4.2V13a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 13V7.2Z"
            stroke="white"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M6.3 14.5V10.3h3.4v4.2" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'insights' as const,
      label: 'Insights',
      colorVar: 'var(--color-violet)' as const,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 12V9.3M6.5 12V6.6M10 12V8M13 12V4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'budgets' as const,
      label: 'Budgets',
      colorVar: 'var(--color-amber)' as const,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="4" width="10" height="9" rx="2" stroke="white" strokeWidth="1.6" />
          <path d="M5.5 7h5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M5.5 9.7h3.2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      colorVar: 'var(--color-violet)' as const,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
            stroke="white"
            strokeWidth="1.6"
          />
          <path
            d="M13.2 8a5.3 5.3 0 0 0-.06-.78l1.02-.78-1.2-2.08-1.23.4a5.4 5.4 0 0 0-1.35-.78L10.2 2H5.8l-.2 1.2c-.48.2-.93.47-1.35.78l-1.23-.4-1.2 2.08 1.02.78A5.3 5.3 0 0 0 2.8 8c0 .27.02.53.06.78l-1.02.78 1.2 2.08 1.23-.4c.42.3.87.57 1.35.78l.2 1.2h4.4l.2-1.2c.48-.2.93-.47 1.35-.78l1.23.4 1.2-2.08-1.02-.78c.04-.25.06-.51.06-.78Z"
            stroke="white"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ])

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="ui-card max-w-md w-full p-5 text-center">
          <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Supabase not configured</p>
          <p className="text-sm">
            Copy <code className="px-1 rounded" style={{ background: 'var(--color-bg-secondary)' }}>.env.example</code> to{' '}
            <code className="px-1 rounded" style={{ background: 'var(--color-bg-secondary)' }}>.env</code> and set{' '}
            <code className="px-1 rounded" style={{ background: 'var(--color-bg-secondary)' }}>VITE_SUPABASE_URL</code> and{' '}
            <code className="px-1 rounded" style={{ background: 'var(--color-bg-secondary)' }}>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />
  }

  const activeNav = (view === 'resetPassword' ? 'dashboard' : view) as NavItemId

  return (
    <div className="min-h-screen pb-28">
      <header className="ui-container" style={{ paddingTop: 18, paddingBottom: 12 }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
              Expense Tracker
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              {view === 'dashboard' ? 'Finance' : view === 'insights' ? 'Insights' : view === 'budgets' ? 'Budgets' : view === 'settings' ? 'Settings' : 'Finance'}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="ui-btn ui-btn-secondary"
              aria-label="Log out"
              title="Log out"
              style={{ minHeight: 40, width: 44, padding: 0 }}
            >
              <IconLogout size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="ui-container" style={{ paddingBottom: 16 }}>
        {view === 'dashboard' && (
          <Dashboard
            accounts={accounts}
            accountsLoading={accountsLoading}
            accountsError={accountsError}
            onAddTransaction={openAddForm}
            onEditTransaction={openEditForm}
            onMutationsReady={setTxMutations}
            onAccountsRefetch={refetchAccounts}
            onError={showToast}
            onOpenBudgets={openBudgets}
          />
        )}
        {view === 'settings' && (
          <Settings onBack={closeSettings} onError={showToast} dark={dark} onToggleTheme={toggleTheme} />
        )}
        {view === 'insights' && <Insights onBack={closeInsights} />}
        {view === 'budgets' && <Budgets onBack={closeBudgets} onError={showToast} />}
        {view === 'resetPassword' && (
          <ResetPassword
            onDone={() => setView('dashboard')}
            onError={showToast}
          />
        )}
      </main>

      {view === 'dashboard' && (
        <div className="fixed left-0 right-0 bottom-[86px] z-10" style={{ paddingLeft: 'var(--space-screen-h)', paddingRight: 'var(--space-screen-h)' }}>
          <div className="mx-auto w-full max-w-2xl flex justify-end">
            <button
              type="button"
              onClick={openAddForm}
              className="ui-btn ui-btn-primary"
              aria-label="Add transaction"
              title="Add transaction"
              style={{ width: 44, padding: 0 }}
            >
              <IconPlus size={18} />
            </button>
          </div>
        </div>
      )}

      {view !== 'resetPassword' && (
        <PillNav
          items={navItems.current}
          activeId={activeNav}
          onSelect={(id) => {
            if (id === 'dashboard') setView('dashboard')
            if (id === 'insights') setView('insights')
            if (id === 'budgets') setView('budgets')
            if (id === 'settings') setView('settings')
          }}
        />
      )}

      {showForm && txMutations && (
        <TransactionForm
          transaction={editingTransaction}
          accounts={accounts}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          onClose={closeForm}
          onSaved={handleTransactionSaved}
          onError={showToast}
          addTransaction={txMutations.addTransaction}
          updateTransaction={txMutations.updateTransaction}
        />
      )}

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 px-4 py-2 max-w-[90vw]"
          role="alert"
          style={{
            bottom: 92,
            borderRadius: 14,
            background: 'var(--color-bg-nav)',
            color: 'var(--text-on-accent)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
