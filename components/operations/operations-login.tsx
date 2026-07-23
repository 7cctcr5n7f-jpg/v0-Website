'use client'

import { useActionState } from 'react'
import { opsLogin } from '@/app/actions/operations'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

type State = { error: string | null; ok?: boolean } | null

export function OperationsLogin() {
  const [state, action, pending] = useActionState<State, FormData>(opsLogin, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.ok) router.refresh()
  }, [state, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-neon-green">Ten Rounds Boxing</p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight">Operations</h1>
          <p className="mt-2 text-sm text-light-grey">Staff &amp; operations dashboard. Enter your passcode to continue.</p>
        </div>
        <form action={action} className="rounded-2xl border border-steel bg-card p-6">
          <label className="block text-xs font-semibold uppercase tracking-wide text-light-grey">
            Passcode
          </label>
          <input
            type="password"
            name="passcode"
            required
            autoFocus
            className="mt-2 w-full rounded-lg border border-steel bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] text-foreground outline-none transition-colors placeholder:text-steel focus:border-neon-green"
            placeholder="····"
          />
          {state?.error && (
            <p className="mt-3 text-center text-sm text-red-400">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-5 w-full rounded-lg bg-neon-green py-3 text-sm font-bold uppercase tracking-wide text-black transition-opacity disabled:opacity-60"
          >
            {pending ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
