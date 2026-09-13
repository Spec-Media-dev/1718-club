'use client'

import { Search as SearchIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './admin.module.css'

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className={styles.switch} onClick={() => onChange(!on)} aria-pressed={on}>
      <span className={`${styles.track} ${on ? styles.trackOn : ''}`}><span className={`${styles.knob} ${on ? styles.knobOn : ''}`} /></span>
      {label}
    </button>
  )
}

export function Pill({ tone = 'off', children }: { tone?: 'on' | 'off' | 'gold' | 'dark'; children: ReactNode }) {
  const cls = tone === 'on' ? styles.pillOn : tone === 'gold' ? styles.pillGold : tone === 'dark' ? styles.pillDark : styles.pillOff
  return <span className={`${styles.pill} ${cls}`}>{children}</span>
}

export function Search({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className={styles.search}>
      <SearchIcon size={16} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className={styles.emptyState}>{children}</div>
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className={styles.emptyState}>{label}</div>
}

/** Formats an ISO date to a short, human date. */
export function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** For <input type="datetime-local"> which needs `yyyy-MM-ddThh:mm`. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
