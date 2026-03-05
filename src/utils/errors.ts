interface ErrorLike {
  code?: string
  message?: string
  status?: number
}

const CODE_MESSAGE_MAP: Record<string, string> = {
  '23505': 'This value is already in use.',
  '23514': 'The submitted value is invalid.',
  '22P02': 'The submitted value has an invalid format.',
  '22003': 'The submitted number is out of range.',
  '42501': 'You do not have permission to perform this action.',
}

function getErrorLike(error: unknown): ErrorLike | null {
  if (!error || typeof error !== 'object') return null
  return error as ErrorLike
}

export function toUserErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const err = getErrorLike(error)
  if (!err) return fallback

  if (err.code && CODE_MESSAGE_MAP[err.code]) return CODE_MESSAGE_MAP[err.code]

  if (typeof err.message === 'string') {
    if (err.message.toLowerCase().includes('invalid login credentials')) {
      return 'Invalid email or password.'
    }
    if (err.message.toLowerCase().includes('email not confirmed')) {
      return 'Please confirm your email before signing in.'
    }
  }

  return fallback
}

export function logInternalError(context: string, error: unknown): void {
  console.error(`[${context}]`, error)
}
