import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { logInternalError, toUserErrorMessage } from '../utils/errors'

type AuthMode = 'login' | 'signup' | 'forgotPassword'

interface AuthProps {
  onSuccess: () => void
}

export default function Auth({ onSuccess }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Date.now() < cooldownUntil) {
      setMessage({ type: 'error', text: 'Please wait a moment before trying again.' })
      return
    }
    setMessage(null)
    setLoading(true)
    setCooldownUntil(Date.now() + 1500)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ type: 'success', text: 'Account created. You can log in now.' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onSuccess()
      }
    } catch (err) {
      logInternalError('Auth.handleSubmit', err)
      setMessage({
        type: 'error',
        text: toUserErrorMessage(err, 'Something went wrong'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Enter your email above first.' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Check your email for a reset link.' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg-screen)' }}>
      <div className="w-full max-w-sm ui-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Welcome back
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            Finance
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="ui-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="ui-input"
            />
          </div>
          {mode === 'login' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="ui-btn ui-btn-ghost"
              style={{ width: '100%', justifyContent: 'center', textTransform: 'none', letterSpacing: 0 }}
            >
              Forgot password?
            </button>
          )}
          {message && (
            <p
              className="text-sm"
              style={{ color: message.type === 'error' ? 'var(--text-negative)' : 'var(--text-positive)' }}
            >
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="ui-btn ui-btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setMessage(null)
          }}
          className="ui-btn ui-btn-secondary"
          style={{ marginTop: 12, width: '100%', textTransform: 'none', letterSpacing: 0 }}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}
