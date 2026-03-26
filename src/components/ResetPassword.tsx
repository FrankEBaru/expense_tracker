import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onDone: () => void
  onError: (msg: string) => void
}

export default function ResetPassword({ onDone, onError }: Props) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      onError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      onError(error.message)
    } else {
      onDone()
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Set new password</h2>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 mb-4"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Update password'}
      </button>
    </div>
  )
}