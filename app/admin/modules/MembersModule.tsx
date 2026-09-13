'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import type { MemberRow, ModuleProps, TierCode } from '../types'
import { Empty, Loading, Pill, Search, fmtDate, fmtDateTime } from '../ui'
import styles from '../admin.module.css'

type Detail = {
  balance: number; lifetime: number; status: string; tier: { code: TierCode; name: string } | null; joined: string | null
  ledger: { amount: number; entry_type: string; description: string | null; created_at: string }[]
  redemptions: { points_spent: number; status: string; redemption_code: string; created_at: string }[]
}

export default function MembersModule({ supabase, notify, fail }: ModuleProps) {
  const [rows, setRows] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<MemberRow | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async (query: string) => {
    setLoading(true)
    let req = supabase.from('profiles').select('id,full_name,email,phone,created_at,referral_code').order('created_at', { ascending: false }).limit(100)
    const term = query.trim()
    if (term) req = req.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
    const { data, error } = await req
    if (error) fail(error.message); else setRows((data as MemberRow[]) ?? [])
    setLoading(false)
  }, [supabase, fail])

  useEffect(() => { load('') }, [load])
  useEffect(() => { const id = setTimeout(() => load(q), 300); return () => clearTimeout(id) }, [q, load])

  async function open(m: MemberRow) {
    setSelected(m); setDetail(null); setDetailLoading(true)
    try {
      const { data: account } = await supabase.from('loyalty_accounts').select('id,lifetime_earned,status').eq('profile_id', m.id).maybeSingle()
      const { data: membership } = await supabase.from('memberships').select('joined_at,membership_tiers(code,name)').eq('profile_id', m.id).maybeSingle()
      let balance = 0, ledger: Detail['ledger'] = [], redemptions: Detail['redemptions'] = []
      if (account) {
        const { data: bal } = await supabase.rpc('current_points', { p_account_id: account.id })
        balance = typeof bal === 'number' ? bal : 0
        const { data: l } = await supabase.from('points_ledger').select('amount,entry_type,description,created_at').eq('account_id', account.id).order('created_at', { ascending: false }).limit(25)
        ledger = l ?? []
        const { data: r } = await supabase.from('reward_redemptions').select('points_spent,status,redemption_code,created_at').eq('account_id', account.id).order('created_at', { ascending: false }).limit(25)
        redemptions = r ?? []
      }
      const tierRel = membership?.membership_tiers as unknown
      const tier = Array.isArray(tierRel) ? tierRel[0] : tierRel
      setDetail({
        balance, lifetime: account?.lifetime_earned ?? 0, status: account?.status ?? 'unknown',
        tier: (tier as Detail['tier']) ?? null, joined: membership?.joined_at ?? null, ledger, redemptions,
      })
    } catch (err) { fail(err instanceof Error ? err.message : 'Unable to load member.') } finally { setDetailLoading(false) }
  }

  if (loading && rows.length === 0) return <>
    <div className={styles.toolbar}><Search value={q} onChange={setQ} placeholder="Search members by name, email or phone…" /></div>
    <Loading label="Loading members…" />
  </>

  return <section className={styles.panel}>
    <div className={styles.toolbar}>
      <Search value={q} onChange={setQ} placeholder="Search members by name, email or phone…" />
      <span className={styles.count}>{rows.length} shown</span>
    </div>

    {rows.length === 0 ? <Empty>{q ? 'No members match your search.' : 'No members have joined yet.'}</Empty> : <div className={styles.list}>{rows.map(m => (
      <button className={styles.listRow} key={m.id} onClick={() => open(m)} style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(23,54,55,.1)', width: '100%' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0e4143', color: '#f2eee5', display: 'grid', placeItems: 'center', flex: 'none', font: '700 13px Inter' }}>{(m.full_name || m.email || '?').slice(0, 2).toUpperCase()}</div>
        <div className={styles.listMain}><b>{m.full_name || 'Unnamed member'}</b><span>{m.email || m.phone || '—'} · joined {fmtDate(m.created_at)}</span></div>
        <div className={styles.listMeta}><ChevronRight size={16} color="#9aa19d" /></div>
      </button>
    ))}</div>}

    {selected && <div className={styles.drawer} onClick={() => setSelected(null)}>
      <div className={styles.drawerCard} onClick={e => e.stopPropagation()}>
        <div className={styles.editorHead}>
          <div><p className={styles.eyebrow}>MEMBER</p><h2 className={styles.panelTitle} style={{ fontSize: 26 }}>{selected.full_name || 'Unnamed member'}</h2></div>
          <button className={styles.iconBtn} onClick={() => setSelected(null)} aria-label="Close"><X size={16} /></button>
        </div>
        {detailLoading || !detail ? <Loading label="Loading profile…" /> : <>
          <div className={styles.statRow}>
            <div className={styles.stat}><b>{detail.balance.toLocaleString()}</b><span>Points</span></div>
            <div className={styles.stat}><b>{detail.lifetime.toLocaleString()}</b><span>Lifetime</span></div>
          </div>
          <dl className={styles.kv}>
            <dt>Tier</dt><dd>{detail.tier ? <Pill tone={detail.tier.code === 'black' ? 'dark' : detail.tier.code === 'gold' ? 'gold' : 'off'}>{detail.tier.name}</Pill> : '—'}</dd>
            <dt>Account status</dt><dd>{detail.status}</dd>
            <dt>Email</dt><dd>{selected.email || '—'}</dd>
            <dt>Phone</dt><dd>{selected.phone || '—'}</dd>
            <dt>Referral code</dt><dd className={styles.mono}>{selected.referral_code || '—'}</dd>
            <dt>Joined</dt><dd>{fmtDate(detail.joined || selected.created_at)}</dd>
          </dl>
          <p className={styles.eyebrow} style={{ marginTop: 18 }}>RECENT POINTS ACTIVITY</p>
          {detail.ledger.length === 0 ? <p className={styles.muted}>No activity yet.</p> : <div className={styles.list}>{detail.ledger.map((e, i) => (
            <div className={styles.listRow} key={i} style={{ padding: '10px 13px' }}>
              <div className={styles.listMain}><b style={{ font: '600 13px Inter' }}>{e.description || e.entry_type}</b><span>{fmtDateTime(e.created_at)}</span></div>
              <div style={{ font: '700 14px Inter', color: e.amount < 0 ? '#8a3e32' : '#275f4a', flex: 'none' }}>{e.amount > 0 ? '+' : ''}{e.amount.toLocaleString()}</div>
            </div>
          ))}</div>}
          {detail.redemptions.length > 0 && <>
            <p className={styles.eyebrow} style={{ marginTop: 18 }}>REDEMPTIONS</p>
            <div className={styles.list}>{detail.redemptions.map((r, i) => (
              <div className={styles.listRow} key={i} style={{ padding: '10px 13px' }}>
                <div className={styles.listMain}><b style={{ font: '600 13px Inter' }} className={styles.mono}>{r.redemption_code}</b><span>{fmtDateTime(r.created_at)} · −{r.points_spent.toLocaleString()} pts</span></div>
                <Pill tone={r.status === 'fulfilled' ? 'on' : 'off'}>{r.status}</Pill>
              </div>
            ))}</div>
          </>}
        </>}
      </div>
    </div>}
  </section>
}
