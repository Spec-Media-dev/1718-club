'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import type { Campaign, ModuleProps } from '../types'
import { Empty, Loading, Pill, Toggle, fmtDateTime, toLocalInput } from '../ui'
import styles from '../admin.module.css'

type Draft = { name: string; description: string; multiplier: string; starts_at: string; ends_at: string; active: boolean }
const blank: Draft = { name: '', description: '', multiplier: '2', starts_at: '', ends_at: '', active: true }

function status(c: Campaign): { tone: 'on' | 'off' | 'gold'; label: string } {
  const now = Date.now(), s = new Date(c.starts_at).getTime(), e = new Date(c.ends_at).getTime()
  if (!c.active) return { tone: 'off', label: 'Inactive' }
  if (now < s) return { tone: 'gold', label: 'Scheduled' }
  if (now > e) return { tone: 'off', label: 'Ended' }
  return { tone: 'on', label: 'Live now' }
}

export default function CampaignsModule({ supabase, notify, fail }: ModuleProps) {
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(blank)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('campaigns').select('*').order('starts_at', { ascending: false })
    if (error) fail(error.message); else setRows((data as Campaign[]) ?? [])
    setLoading(false)
  }, [supabase, fail])
  useEffect(() => { load() }, [load])

  function startNew() { setDraft(blank); setEditing('new') }
  function startEdit(c: Campaign) {
    setDraft({ name: c.name, description: c.description ?? '', multiplier: String(c.multiplier), starts_at: toLocalInput(c.starts_at), ends_at: toLocalInput(c.ends_at), active: c.active })
    setEditing(c.id)
  }

  async function save() {
    setSaving(true)
    try {
      const multiplier = parseFloat(draft.multiplier)
      if (!draft.name.trim()) throw new Error('Name is required.')
      if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error('Multiplier must be greater than zero.')
      if (!draft.starts_at || !draft.ends_at) throw new Error('Start and end dates are required.')
      if (new Date(draft.ends_at) <= new Date(draft.starts_at)) throw new Error('End must be after start.')
      const payload = {
        name: draft.name.trim(), description: draft.description.trim() || null, multiplier,
        starts_at: new Date(draft.starts_at).toISOString(), ends_at: new Date(draft.ends_at).toISOString(), active: draft.active,
      }
      if (editing === 'new') { const { error } = await supabase.from('campaigns').insert(payload); if (error) throw error; notify('Campaign created.') }
      else { const { error } = await supabase.from('campaigns').update(payload).eq('id', editing); if (error) throw error; notify('Campaign updated.') }
      setEditing(null); await load()
    } catch (err) { fail(err instanceof Error ? err.message : 'Unable to save campaign.') } finally { setSaving(false) }
  }

  async function remove(c: Campaign) {
    if (!confirm(`Delete “${c.name}”?`)) return
    const { error } = await supabase.from('campaigns').delete().eq('id', c.id)
    if (error) { fail(error.message); return }
    notify('Campaign deleted.'); await load()
  }

  if (loading) return <Loading label="Loading campaigns…" />

  return <section className={styles.panel}>
    <div className={styles.toolbar}>
      <div><h2 className={styles.panelTitle}>Campaigns</h2><p className={styles.muted}>Time-boxed point multipliers, e.g. double points weekends.</p></div>
      <button className={styles.primary} onClick={startNew}><Plus size={15} /> New campaign</button>
    </div>

    {editing && <div className={styles.add}>
      <div className={styles.editorHead}><b style={{ font: '600 15px Inter', color: '#0e4143' }}>{editing === 'new' ? 'New campaign' : 'Edit campaign'}</b></div>
      <div className={styles.rowGrid2}>
        <div className={styles.field}><label>Name</label><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Double Points Weekend" /></div>
        <div className={styles.field}><label>Point multiplier</label><input type="number" min={1} step="0.5" value={draft.multiplier} onChange={e => setDraft({ ...draft, multiplier: e.target.value })} placeholder="2" /></div>
      </div>
      <div className={styles.field}><label>Description</label><textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
      <div className={styles.rowGrid2}>
        <div className={styles.field}><label>Starts</label><input type="datetime-local" value={draft.starts_at} onChange={e => setDraft({ ...draft, starts_at: e.target.value })} /></div>
        <div className={styles.field}><label>Ends</label><input type="datetime-local" value={draft.ends_at} onChange={e => setDraft({ ...draft, ends_at: e.target.value })} /></div>
      </div>
      <div className={styles.row} style={{ margin: '2px 0' }}><Toggle on={draft.active} onChange={v => setDraft({ ...draft, active: v })} label="Active" /></div>
      <div className={styles.editorActions}>
        <button className={styles.ghost} onClick={() => setEditing(null)}>Cancel</button>
        <button className={styles.primary} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save campaign'}</button>
      </div>
    </div>}

    {rows.length === 0 ? <Empty>No campaigns yet. Schedule a double-points weekend to get started.</Empty> : <div className={styles.list}>{rows.map(c => {
      const st = status(c)
      return <div className={styles.listRow} key={c.id}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f2ebdd', display: 'grid', placeItems: 'center', flex: 'none', color: '#8d6a2b' }}><Sparkles size={18} /></div>
        <div className={styles.listMain}>
          <b>{c.name} <span className={styles.badge}>· {c.multiplier}×</span></b>
          <span>{fmtDateTime(c.starts_at)} → {fmtDateTime(c.ends_at)}</span>
        </div>
        <div className={styles.listMeta}>
          <Pill tone={st.tone}>{st.label}</Pill>
          <button className={styles.iconBtn} onClick={() => startEdit(c)} aria-label="Edit"><Pencil size={15} /></button>
          <button className={`${styles.iconBtn} ${styles.iconDanger}`} onClick={() => remove(c)} aria-label="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
    })}</div>}
  </section>
}
