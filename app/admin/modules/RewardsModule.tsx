'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ModuleProps, Reward, TierCode } from '../types'
import { Empty, Loading, Pill, Toggle } from '../ui'
import styles from '../admin.module.css'

type Draft = {
  name: string; description: string; points_cost: string; tier_code: '' | TierCode
  active: boolean; secret: boolean; inventory_limit: string
}
const blank: Draft = { name: '', description: '', points_cost: '', tier_code: '', active: true, secret: false, inventory_limit: '' }

export default function RewardsModule({ supabase, notify, fail }: ModuleProps) {
  const [rows, setRows] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(blank)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('rewards').select('*').order('points_cost')
    if (error) fail(error.message); else setRows((data as Reward[]) ?? [])
    setLoading(false)
  }, [supabase, fail])
  useEffect(() => { load() }, [load])

  function startNew() { setDraft(blank); setEditing('new') }
  function startEdit(r: Reward) {
    setDraft({ name: r.name, description: r.description ?? '', points_cost: String(r.points_cost), tier_code: r.tier_code ?? '', active: r.active, secret: r.secret, inventory_limit: r.inventory_limit == null ? '' : String(r.inventory_limit) })
    setEditing(r.id)
  }

  async function save() {
    setSaving(true)
    try {
      const points = parseInt(draft.points_cost, 10)
      if (!draft.name.trim()) throw new Error('Name is required.')
      if (!Number.isFinite(points) || points <= 0) throw new Error('Points cost must be a positive number.')
      const payload = {
        name: draft.name.trim(), description: draft.description.trim() || null, points_cost: points,
        tier_code: draft.tier_code || null, active: draft.active, secret: draft.secret,
        inventory_limit: draft.inventory_limit.trim() === '' ? null : parseInt(draft.inventory_limit, 10),
      }
      if (payload.inventory_limit != null && (!Number.isFinite(payload.inventory_limit) || payload.inventory_limit < 0)) throw new Error('Inventory limit must be zero or more.')
      if (editing === 'new') {
        const { error } = await supabase.from('rewards').insert(payload)
        if (error) throw error
        notify('Reward created.')
      } else {
        const { error } = await supabase.from('rewards').update(payload).eq('id', editing)
        if (error) throw error
        notify('Reward updated.')
      }
      setEditing(null); await load()
    } catch (err) { fail(err instanceof Error ? err.message : 'Unable to save reward.') } finally { setSaving(false) }
  }

  async function remove(r: Reward) {
    if (!confirm(`Delete “${r.name}”? Existing redemptions are preserved.`)) return
    const { error } = await supabase.from('rewards').delete().eq('id', r.id)
    if (error) { fail(error.message.includes('violates foreign key') ? 'This reward has redemptions — set it inactive instead of deleting.' : error.message); return }
    notify('Reward deleted.'); await load()
  }

  if (loading) return <Loading label="Loading rewards…" />

  return <section className={styles.panel}>
    <div className={styles.toolbar}>
      <div><h2 className={styles.panelTitle}>Rewards</h2><p className={styles.muted}>What members can redeem their points for. Live in the customer app.</p></div>
      <button className={styles.primary} onClick={startNew}><Plus size={15} /> New reward</button>
    </div>

    {editing && <div className={styles.add}>
      <div className={styles.editorHead}><b style={{ font: '600 15px Inter', color: '#0e4143' }}>{editing === 'new' ? 'New reward' : 'Edit reward'}</b></div>
      <div className={styles.rowGrid2}>
        <div className={styles.field}><label>Name</label><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Free Drink on Us" /></div>
        <div className={styles.field}><label>Points cost</label><input type="number" min={1} value={draft.points_cost} onChange={e => setDraft({ ...draft, points_cost: e.target.value })} placeholder="1500" /></div>
      </div>
      <div className={styles.field}><label>Description</label><textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Redeem a signature drink on your next visit." /></div>
      <div className={styles.rowGrid2}>
        <div className={styles.field}><label>Required tier</label>
          <select className={styles.select} value={draft.tier_code} onChange={e => setDraft({ ...draft, tier_code: e.target.value as Draft['tier_code'] })}>
            <option value="">Any member</option><option value="member">Member</option><option value="gold">Gold</option><option value="black">Black</option>
          </select>
        </div>
        <div className={styles.field}><label>Inventory limit (optional)</label><input type="number" min={0} value={draft.inventory_limit} onChange={e => setDraft({ ...draft, inventory_limit: e.target.value })} placeholder="Unlimited" /></div>
      </div>
      <div className={styles.row} style={{ margin: '4px 0 2px' }}>
        <Toggle on={draft.active} onChange={v => setDraft({ ...draft, active: v })} label="Active" />
        <Toggle on={draft.secret} onChange={v => setDraft({ ...draft, secret: v })} label="Secret menu" />
      </div>
      <div className={styles.editorActions}>
        <button className={styles.ghost} onClick={() => setEditing(null)}>Cancel</button>
        <button className={styles.primary} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save reward'}</button>
      </div>
    </div>}

    {rows.length === 0 ? <Empty>No rewards yet. Create your first reward.</Empty> : <div className={styles.list}>{rows.map(r => (
      <div className={styles.listRow} key={r.id}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f2ebdd', display: 'grid', placeItems: 'center', flex: 'none', color: '#8d6a2b' }}><Gift size={18} /></div>
        <div className={styles.listMain}>
          <b>{r.name}</b>
          <span>{r.points_cost.toLocaleString()} points{r.tier_code ? ` · ${r.tier_code} tier` : ''}{r.inventory_limit != null ? ` · limit ${r.inventory_limit}` : ''}</span>
        </div>
        <div className={styles.listMeta}>
          {r.secret && <Pill tone="dark">Secret</Pill>}
          <Pill tone={r.active ? 'on' : 'off'}>{r.active ? 'Active' : 'Inactive'}</Pill>
          <button className={styles.iconBtn} onClick={() => startEdit(r)} aria-label="Edit"><Pencil size={15} /></button>
          <button className={`${styles.iconBtn} ${styles.iconDanger}`} onClick={() => remove(r)} aria-label="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
    ))}</div>}
  </section>
}
