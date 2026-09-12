'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, CheckCircle2, Crown, Mail } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'

export default function JoinClub() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      if (!supabase) throw new Error('Club connection is not configured yet.')
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      if (authError) throw authError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell join-shell">
      <section className="join-card">
        <div className="join-brand"><span>17</span><i>18</i><b>CLUB</b></div>
        <div className="join-icon"><Crown size={22} /></div>
        {!sent ? <>
          <p className="micro">PRIVATE MEMBERSHIP</p>
          <h1>More than coffee.</h1>
          <p className="join-copy">Join 1718 CLUB for rewards, priority access, secret menu drops and member-only experiences.</p>
          <form onSubmit={submit}>
            <label htmlFor="email">Email address</label>
            <div className="join-input"><Mail size={17} /><input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <button className="primary-btn" disabled={loading}>{loading ? 'Sending…' : 'Join 1718 CLUB'} <ArrowRight size={17} /></button>
          </form>
          {error && <p className="join-error">{error}</p>}
        </> : <div className="join-success"><CheckCircle2 size={38} /><p className="micro">CHECK YOUR INBOX</p><h1>Your invitation is on its way.</h1><p>We sent a secure sign-in link to <strong>{email}</strong>. Open it on this device to enter your Club.</p><button className="text-btn" onClick={() => setSent(false)}>Use another email</button></div>}
      </section>
    </main>
  )
}
