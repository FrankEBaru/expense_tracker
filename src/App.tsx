import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import Auth from './components/Auth'
import ExpenseList from './components/ExpenseList'
import MonthTotal from './components/MonthTotal'
import ExpenseForm from './components/ExpenseForm'
import type { Expense } from './types/expense'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

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

  const openAddForm = () => {
    setEditingExpense(null)
    setShowForm(true)
  }

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingExpense(null)
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center text-gray-600 max-w-md">
          <p className="font-medium text-gray-800 mb-2">Supabase not configured</p>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Auth onSuccess={() => {}} />
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Expenses</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Log out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        <MonthTotal selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        <ExpenseList
          selectedMonth={selectedMonth}
          onEdit={openEditForm}
        />
      </main>

      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          onClose={closeForm}
          onSaved={closeForm}
        />
      )}

      <div className="fixed bottom-6 left-0 right-0 max-w-2xl mx-auto px-4 flex justify-center pb-safe">
        <button
          type="button"
          onClick={openAddForm}
          className="py-3 px-6 bg-blue-600 text-white font-medium rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add expense
        </button>
      </div>
    </div>
  )
}

export default App
