import { useEffect, useState, useCallback, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Insights from './components/Insights'
import Settings from './components/Settings'
import TransactionForm from './components/TransactionForm'
import { useAccounts } from './hooks/useAccounts'
import { useCategories } from './hooks/useCategories'
import type { Transaction } from './types/transaction'
import type { TransactionInsert } from './types/transaction'
import type { TransactionUpdate } from './types/transaction'

type View = 'dashboard' | 'settings' | 'insights'

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
    if ((prevViewRef.current === 'settings' || prevViewRef.current === 'insights') && view === 'dashboard') {
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
  const openInsights = useCallback(() => setView('insights'), [])
  const closeInsights = useCallback(() => setView('dashboard'), [])

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
          {view === 'dashboard' ? 'Finance' : view === 'insights' ? 'Insights' : 'Settings'}
        </h1>
        <div className="flex items-center gap-3">
          {view === 'dashboard' && (
            <button
              type="button"
              onClick={openInsights}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Insights
            </button>
          )}
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
            onError={showToast}
          />
        )}
        {view === 'settings' && <Settings onBack={closeSettings} onError={showToast} />}
        {view === 'insights' && <Insights onBack={closeInsights} />}
      </main>

      {view === 'dashboard' && (
        <button
          type="button"
          onClick={openAddForm}
          className="fixed bottom-6 right-6 z-10 py-3 px-6 bg-blue-600 text-white font-medium rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          aria-label="Add transaction"
        >
          Add transaction
        </button>
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
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm shadow-lg dark:bg-gray-700 max-w-[90vw]"
          role="alert"
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default App
