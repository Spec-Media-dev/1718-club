'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import type { ModuleProps, Tier } from '../types'
import { Loading, Pill, Toggle } from '../ui'
import styles from '../admin.module.css'

export default function ClubModule({ supabase, notify, fail }: ModuleProps) {
  const [rows, setRows] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('membership_tiers').select('*').order('sort_order')
    if (error) fail(error.message); else setRows((data as Tier[]) ?? [])
    setLoading(false)
  }, [supabase, fail])
  useEffect(() => { load() }, [load])

  function patch(id: string, changes: Partial<Tier>) { setRows(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t)) }

  async function save(t: Tier) {
    setSavingId(t.id)
    try {
      const label = typeof t.benefits?.label === 'string' ? t.benefits.label : ''
      const { error } = await supabase.from('membership_tiers').update({
        name: t.name.trim(), min_points: t.min_points, invitation_only: t.invitation_only, active: t.active,
        benefits: { ...(t.benefits ?? {}), label },
      }).eq('id', t.id)
      if (error) throw error
      notify(`${t.name} tier saved.`)
    } catch (err) { fail(err instanceof Error ? err.message : 'Unable to save tier.') } finally { setSavingId(null) }
  }

  if (loading) return <Loading label="Loading tiers…" />

  return <section className={styles.panel}>
    <div className={styles.toolbar}>
      <div><h2 className={styles.panelTitle}>Club tiers</h2><p className={styles.muted}>Thresholds and benefits for Member, Gold and Black. A member’s tier is derived from lifetime points.</p></div>
    </div>
    <div className={styles.list}>{rows.map(t => {
      const tone = t.code === 'black' ? 'dark' : t.code === 'gold' ? 'gold' : 'off'
      const label = typeof t.benefits?.label === 'string' ? t.benefits.label : ''
      return <div className={styles.add} key={t.id} style={{ marginBottom: 0 }}>
        <div className={styles.editorHead}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Crown size={17} color="#8d6a2b" /><b style={{ font: '600 16px Inter', color: '#0e4143' }}>{t.name}</b><Pill tone={tone}>{t.code}</Pill></div>
          <button className={styles.primary} onClick={() => save(t)} disabled={savingId === t.id}>{savingId === t.id ? 'Saving…' : 'Save'}</button>
        </div>
        <div className={styles.rowGrid2}>
          <div className={styles.field}><label>Display name</label><input value={t.name} onChange={e => patch(t.id, { name: e.target.value })} /></div>
          <div className={styles.field}><label>Minimum lifetime points</label><input type="number" min={0} value={t.min_points} disabled={t.invitation_only} onChange={e => patch(t.id, { min_points: parseInt(e.target.value, 10) || 0 })} />{t.invitation_only && <p className={styles.helper}>Ignored — this tier is invitation only.</p>}</div>
        </div>
        <div className={styles.field}><label>Benefit summary</label><input value={label} onChange={e => patch(t.id, { benefits: { ...(t.benefits ?? {}), label: e.target.value } })} placeholder="Priority access, secret menu, member events" /></div>
        <div className={styles.row} style={{ margin: '2px 0' }}>
          <Toggle on={t.invitation_only} onChange={v => patch(t.id, { invitation_only: v })} label="Invitation only" />
          <Toggle on={t.active} onChange={v => patch(t.id, { active: v })} label="Active" />
        </div>
      </div>
    })}</div>
  </section>
}
