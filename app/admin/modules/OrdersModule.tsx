'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { ModuleProps } from '../types'
import { Empty, Loading, Pill, fmtDateTime } from '../ui'
import styles from '../admin.module.css'

type OrderLine = { id: number; name: string; price: number; qty: number }
type Order = {
  id: string; code: string; status: string; order_type: string; items: OrderLine[]
  subtotal: number; delivery_fee: number; total: number; customer_name: string | null
  phone: string | null; address: string | null; note: string | null; payment_method: string; created_at: string
}
const STATUSES = ['received', 'preparing', 'ready', 'completed', 'cancelled']
const tone = (s: string): 'on' | 'off' | 'gold' | 'dark' => s === 'completed' ? 'on' : s === 'cancelled' ? 'off' : s === 'ready' ? 'gold' : 'dark'

export default function OrdersModule({ supabase, notify, fail }: ModuleProps) {
  const [rows, setRows] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('active')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
    if (error) fail(error.message); else setRows((data as Order[]) ?? [])
    setLoading(false)
  }, [supabase, fail])
  useEffect(() => { load() }, [load])

  async function setStatus(o: Order, status: string) {
    setRows(prev => prev.map(r => r.id === o.id ? { ...r, status } : r))
    const { error } = await supabase.from('orders').update({ status }).eq('id', o.id)
    if (error) { fail(error.message); load(); } else notify(`Order ${o.code} → ${status}`)
  }

  const shown = rows.filter(o => filter === 'all' ? true : filter === 'active' ? !['completed', 'cancelled'].includes(o.status) : o.status === filter)
  const activeCount = rows.filter(o => !['completed', 'cancelled'].includes(o.status)).length

  if (loading) return <Loading label="Loading orders…" />

  return <section className={styles.panel}>
    <div className={styles.toolbar}>
      <div><h2 className={styles.panelTitle}>Orders</h2><p className={styles.muted}>{activeCount} active · live guest orders from the app.</p></div>
      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}><RefreshCw size={14} /> Refresh</button>
    </div>
    <div className={styles.tabs} style={{ marginBottom: 14 }}>
      {['active', 'received', 'preparing', 'ready', 'completed', 'all'].map(f => <button key={f} className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
    </div>
    {shown.length === 0 ? <Empty>No orders here yet.</Empty> : <div className={styles.list}>{shown.map(o => (
      <div className={styles.listRow} key={o.id} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={styles.mono} style={{ font: '700 15px ui-monospace,Menlo,monospace', color: '#0e4143' }}>{o.code}</div>
          <Pill tone={o.order_type === 'delivery' ? 'gold' : 'off'}>{o.order_type}</Pill>
          <Pill tone={tone(o.status)}>{o.status}</Pill>
          <div style={{ flex: 1 }} />
          <div style={{ font: '600 14px Inter', color: '#0e4143' }}>EGP {o.total.toLocaleString()}</div>
        </div>
        <div className={styles.muted} style={{ font: '500 12px Inter' }}>
          {o.items.map(l => `${l.qty}× ${l.name}`).join(' · ')}
        </div>
        <div className={styles.muted} style={{ font: '400 11px Inter' }}>
          {(o.customer_name || 'Guest')}{o.phone ? ` · ${o.phone}` : ''} · {o.payment_method}{o.address ? ` · ${o.address}` : ''}{o.note ? ` · “${o.note}”` : ''} · {fmtDateTime(o.created_at)}
        </div>
        <div className={styles.row} style={{ gap: 8 }}>
          <select className={styles.select} value={o.status} onChange={e => setStatus(o, e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    ))}</div>}
  </section>
}
