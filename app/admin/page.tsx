'use client'

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Check, LogOut, RefreshCw, X } from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '../../lib/supabase/client'
import styles from './admin.module.css'
import type { ModuleProps } from './types'
import MediaModule from './modules/MediaModule'
import ProductsModule from './modules/ProductsModule'
import RewardsModule from './modules/RewardsModule'
import ClubModule from './modules/ClubModule'
import MembersModule from './modules/MembersModule'
import CampaignsModule from './modules/CampaignsModule'
import AuditModule from './modules/AuditModule'
import InventoryModule from './modules/InventoryModule'

const TABS = ['Media', 'Products', 'Inventory', 'Rewards', 'Club', 'Members', 'Campaigns', 'Audit'] as const
type Tab = typeof TABS[number]

const MODULES: Record<Tab, (p: ModuleProps) => ReactNode> = {
  Media: p => <MediaModule {...p} />,
  Products: p => <ProductsModule {...p} />,
  Rewards: p => <RewardsModule {...p} />,
  Club: p => <ClubModule {...p} />,
  Members: p => <MembersModule {...p} />,
  Campaigns: p => <CampaignsModule {...p} />,
  Audit: p => <AuditModule {...p} />,
  Inventory: p => <InventoryModule {...p} />,
}

export default function AdminPage() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [tab, setTab] = useState<Tab>('Media')

  useEffect(() => {
    try { setSupabase(createClient()) }
    catch (err) { setError(err instanceof Error ? err.message : 'Supabase environment variables are not configured.'); setLoading(false) }
  }, [])

  const check = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setAuthorized(false); setLoading(false); return }
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_cms_admin')
    if (adminError || !isAdmin) { setAuthorized(false); setError('This account is not authorized for the 1718 CMS.'); setLoading(false); return }
    setAuthorized(true); setLoading(false)
  }, [supabase])
  useEffect(() => { if (supabase) check() }, [supabase, check])

  async function signIn(e: FormEvent) {
    e.preventDefault(); if (!supabase) return; setError(''); setNotice('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/admin` } })
    if (error) setError(error.message); else setSent(true)
  }
  async function signOut() { if (!supabase) return; await supabase.auth.signOut(); setAuthorized(false); setSent(false) }

  const notify = useCallback((m: string) => { setNotice(m); setError(''); window.setTimeout(() => setNotice(''), 3200) }, [])
  const fail = useCallback((m: string) => { setError(m); setNotice('') }, [])

  if (loading) return <main className={styles.shell}><div className={styles.wrap}><p className={styles.sub}>Loading 1718 CMS…</p></div></main>

  if (!authorized) return <main className={styles.shell}><section className={styles.login}>
    <div className={styles.logo}>17<span>18</span> CLUB</div>
    <p className={styles.eyebrow}>PRIVATE ADMINISTRATION</p>
    <h1 className={styles.title}>1718 CMS</h1>
    <p className={styles.sub}>Manage the Club experience — imagery, menu, rewards, tiers, members and campaigns. Sign in with your authorized 1718 admin email.</p>
    {sent
      ? <><div className={styles.notice}>Magic link sent. Open it on this device, then return to /admin.</div><button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setSent(false)}>Use another email</button></>
      : <form onSubmit={signIn}><div className={styles.field}><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@1718cafe.com" /></div><button className={styles.btn}>Send secure sign-in link</button></form>}
    {error && <div className={styles.error}>{error}</div>}
    <p className={styles.footer}>CMS access is protected by Supabase Auth + database RLS. Every change is written to a tamper-resistant audit trail.</p>
  </section></main>

  const props: ModuleProps = { supabase: supabase as SupabaseClient, notify, fail }

  return <main className={styles.shell}><div className={styles.wrap}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>1718 CLUB · ADMIN</p><h1 className={styles.title}>Content Studio</h1><p className={styles.sub}>Control the Club experience without redeploying the app. Every change is audited.</p></div>
      <div className={styles.row}><button className={`${styles.btn} ${styles.btnGhost}`} onClick={check}><RefreshCw size={14} /> Refresh</button><button className={styles.btn} onClick={signOut}><LogOut size={14} /> Sign out</button></div>
    </header>
    <div className={styles.tabs}>{TABS.map(t => <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>{t}</button>)}</div>
    {notice && <div className={styles.notice}><Check size={15} /> {notice}</div>}
    {error && <div className={styles.error}><X size={15} /> {error}</div>}
    {MODULES[tab](props)}
    <footer className={styles.footer}>1718 CLUB Content Studio · Supabase + Row Level Security · Privileged reads and writes are authorized per request by is_cms_admin().</footer>
  </div></main>
}
