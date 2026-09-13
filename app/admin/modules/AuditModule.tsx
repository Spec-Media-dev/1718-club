'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { AuditRow, ModuleProps } from '../types'
import { Empty, Loading, Pill, Search, fmtDateTime } from '../ui'
import styles from '../admin.module.css'

export default function AuditModule({ supabase, fail }: ModuleProps) {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
    if (error) fail(error.message); else setRows((data as AuditRow[]) ?? [])
    setLoading(false)
  }, [supabase, fail])
  useEffect(() => { load() }, [load])

  const term = q.trim().toLowerCase()
  const filtered = term ? rows.filter(r => `${r.action} ${r.entity_type} ${r.entity_id ?? ''}`.toLowerCase().includes(term)) : rows

  function verb(action: string): 'on' | 'off' | 'gold' {
    if (action.endsWith('.delete')) return 'off'
    if (action.endsWith('.insert')) return 'on'
    return 'gold'
  }

  if (loading) return <Loading label="Loading audit trail…" />

  return <section className={styles.panel}>
    <div className={styles.toolbar}>
      <div><h2 className={styles.panelTitle}>Audit trail</h2><p className={styles.muted}>Every content and configuration change, written by the database itself.</p></div>
    </div>
    <div className={styles.toolbar}><Search value={q} onChange={setQ} placeholder="Filter by action, entity or id…" /><span className={styles.count}>{filtered.length} events</span></div>
    {filtered.length === 0 ? <Empty>{rows.length === 0 ? 'No changes recorded yet.' : 'No events match your filter.'}</Empty> : <div className={styles.list}>{filtered.map(r => {
      const open = openId === r.id
      return <div key={r.id} className={styles.listRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
        <button onClick={() => setOpenId(open ? null : r.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          {open ? <ChevronDown size={15} color="#9aa19d" /> : <ChevronRight size={15} color="#9aa19d" />}
          <div className={styles.listMain}><b>{r.action}</b><span>{fmtDateTime(r.created_at)}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ''}</span></div>
          <Pill tone={verb(r.action)}>{r.entity_type}</Pill>
        </button>
        {open && <pre className={styles.jsonBox}>{JSON.stringify({ actor: r.actor_id, ...r.metadata }, null, 2)}</pre>}
      </div>
    })}</div>}
  </section>
}
