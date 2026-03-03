import { useEffect, useState, useCallback, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import TransactionForm from './components/TransactionForm'
import { useAccounts } from './hooks/useAccounts'
import { useCategories } from './hooks/useCategories'
import type { Transaction } from './types/transaction'
import type { TransactionInsert } from './types/transaction'
import type { TransactionUpdate } from './types/transaction'

type View = 'dashboard' | 'settings'

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

  const prevViewRef = useRef<View>(view)
  useEffect(() => {
    if (prevViewRef.current === 'settings' && view === 'dashboard') {
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
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

  const openSettings = useCallback(() => setView('settings'), [])
  const closeSettings = useCallback(() => setView('dashboard'), [])

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-gray-600 dark:text-gray-400 max-w-md">
          <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">Supabase not configured</p>
          <p className="text-sm">
            Copy <code className="bg-gray-200 px-1 rounded">.env.example</code> to{' '}
            <code className="bg-gray-200 px-1 rounded">.env</code> and set{' '}
            <code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="bg-gray-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {view === 'dashboard' ? 'Finance' : 'Settings'}
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {view === 'dashboard' && (
          <Dashboard
            accounts={accounts}
            accountsLoading={accountsLoading}
            accountsError={accountsError}
            onAddTransaction={openAddForm}
            onOpenSettings={openSettings}
            onEditTransaction={openEditForm}
            onMutationsReady={setTxMutations}
            onAccountsRefetch={refetchAccounts}
          />
        )}
        {view === 'settings' && <Settings onBack={closeSettings} />}
      </main>

      {showForm && txMutations && (
        <TransactionForm
          transaction={editingTransaction}
          accounts={accounts}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          onClose={closeForm}
          onSaved={handleTransactionSaved}
          addTransaction={txMutations.addTransaction}
          updateTransaction={txMutations.updateTransaction}
        />
      )}
    </div>
  )
}

export default App
