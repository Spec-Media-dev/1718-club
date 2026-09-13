'use client'

import { useCallback, useEffect, useState } from 'react'
import { Coffee, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ModuleProps, Product } from '../types'
import { Empty, Loading, Pill, Toggle } from '../ui'
import styles from '../admin.module.css'

type Draft = {
  name: string; category: string; description: string; price: string
  image_slot: string; badge: string; tone: string; available: boolean; active: boolean; sort_order: string
}
const blank: Draft = { name: '', category: 'coffee', description: '', price: '', image_slot: '', badge: '', tone: 'coffee', available: true, active: true, sort_order: '0' }

export default function ProductsModule({ supabase, notify, fail }: ModuleProps) {
  const [rows, setRows] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(blank)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('sort_order').order('name')
    if (error) {
      if (/relation .*products.* does not exist|schema cache|find the table/i.test(error.message)) setMissing(true)
      else fail(error.message)
    } else { setMissing(false); setRows((data as Product[]) ?? []) }
    setLoading(false)
  }, [supabase, fail])
  useEffect(() => { load() }, [load])

  function startNew() { setDraft({ ...blank, sort_order: String(rows.length + 1) }); setEditing('new') }
  function startEdit(p: Product) {
    setDraft({ name: p.name, category: p.category, description: p.description ?? '', price: String(p.price), image_slot: p.image_slot ?? '', badge: p.badge ?? '', tone: p.tone ?? 'coffee', available: p.available, active: p.active, sort_order: String(p.sort_order) })
    setEditing(p.id)
  }

  async function save() {
    setSaving(true)
    try {
      const price = parseFloat(draft.price)
      if (!draft.name.trim()) throw new Error('Name is required.')
      if (!Number.isFinite(price) || price < 0) throw new Error('Price must be zero or more.')
      const payload = {
        name: draft.name.trim(), category: draft.category.trim() || 'coffee', description: draft.description.trim() || null,
        price, image_slot: draft.image_slot.trim() || null, badge: draft.badge.trim() || null,
        tone: draft.tone.trim() || null, available: draft.available, active: draft.active,
        sort_order: parseInt(draft.sort_order, 10) || 0,
      }
      if (editing === 'new') {
        const { error } = await supabase.from('products').insert(payload); if (error) throw error; notify('Product created.')
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', editing); if (error) throw error; notify('Product updated.')
      }
      setEditing(null); await load()
    } catch (err) { fail(err instanceof Error ? err.message : 'Unable to save product.') } finally { setSaving(false) }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete “${p.name}”?`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) { fail(error.message); return }
    notify('Product deleted.'); await load()
  }

  if (loading) return <Loading label="Loading products…" />
  if (missing) return <section className={styles.panel}>
    <h2 className={styles.panelTitle}>Products</h2>
    <p className={styles.sub}>The product catalogue table isn’t in the database yet. Apply migration <span className={styles.mono}>0002_cms_operational.sql</span> in Supabase, then reload — this module will manage the live menu.</p>
  </section>

  return <section className={styles.panel}>
    <div className={styles.toolbar}>
      <div><h2 className={styles.panelTitle}>Products</h2><p className={styles.muted}>The 1718 menu. Link each product to a CMS image slot to control its photo.</p></div>
      <button className={styles.primary} onClick={startNew}><Plus size={15} /> New product</button>
    </div>

    {editing && <div className={styles.add}>
      <div className={styles.editorHead}><b style={{ font: '600 15px Inter', color: '#0e4143' }}>{editing === 'new' ? 'New product' : 'Edit product'}</b></div>
      <div className={styles.rowGrid2}>
        <div className={styles.field}><label>Name</label><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Iced Matcha Latte" /></div>
        <div className={styles.field}><label>Price (EGP)</label><input type="number" min={0} step="0.01" value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })} placeholder="120" /></div>
      </div>
      <div className={styles.field}><label>Description</label><textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} /></div>
      <div className={styles.rowGrid}>
        <div className={styles.field}><label>Category</label><input value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} placeholder="coffee" /></div>
        <div className={styles.field}><label>Badge</label><input value={draft.badge} onChange={e => setDraft({ ...draft, badge: e.target.value })} placeholder="NEW" /></div>
        <div className={styles.field}><label>Sort order</label><input type="number" value={draft.sort_order} onChange={e => setDraft({ ...draft, sort_order: e.target.value })} /></div>
      </div>
      <div className={styles.rowGrid2}>
        <div className={styles.field}><label>Image slot (CMS)</label><input value={draft.image_slot} onChange={e => setDraft({ ...draft, image_slot: e.target.value })} placeholder="product_matcha" /><p className={styles.helper}>Matches a slot key in the Media tab.</p></div>
        <div className={styles.field}><label>Fallback art tone</label>
          <select className={styles.select} value={draft.tone} onChange={e => setDraft({ ...draft, tone: e.target.value })}>
            <option value="matcha">Matcha (green)</option><option value="coffee">Coffee (brown)</option><option value="orange">Orange</option>
          </select>
        </div>
      </div>
      <div className={styles.row} style={{ margin: '4px 0 2px' }}>
        <Toggle on={draft.active} onChange={v => setDraft({ ...draft, active: v })} label="Active (visible)" />
        <Toggle on={draft.available} onChange={v => setDraft({ ...draft, available: v })} label="Available to order" />
      </div>
      <div className={styles.editorActions}>
        <button className={styles.ghost} onClick={() => setEditing(null)}>Cancel</button>
        <button className={styles.primary} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save product'}</button>
      </div>
    </div>}

    {rows.length === 0 ? <Empty>No products yet. Create your first menu item.</Empty> : <div className={styles.list}>{rows.map(p => (
      <div className={styles.listRow} key={p.id}>
        {p.image_slot ? <img className={styles.listThumb} src={`/api/media/${encodeURIComponent(p.image_slot)}`} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} /> : <div style={{ width: 52, height: 52, borderRadius: 12, background: '#f2ebdd', display: 'grid', placeItems: 'center', flex: 'none', color: '#8d6a2b' }}><Coffee size={20} /></div>}
        <div className={styles.listMain}>
          <b>{p.name} {p.badge && <span className={styles.badge}>· {p.badge}</span>}</b>
          <span>{p.currency} {p.price.toLocaleString()} · {p.category}{p.image_slot ? ` · ${p.image_slot}` : ' · no photo'}</span>
        </div>
        <div className={styles.listMeta}>
          {!p.available && <Pill tone="off">Sold out</Pill>}
          <Pill tone={p.active ? 'on' : 'off'}>{p.active ? 'Live' : 'Hidden'}</Pill>
          <button className={styles.iconBtn} onClick={() => startEdit(p)} aria-label="Edit"><Pencil size={15} /></button>
          <button className={`${styles.iconBtn} ${styles.iconDanger}`} onClick={() => remove(p)} aria-label="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
    ))}</div>}
  </section>
}
