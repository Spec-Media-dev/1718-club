'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react'
import { ImagePlus, RefreshCw, Trash2, Upload } from 'lucide-react'
import type { Media, ModuleProps } from '../types'
import { Loading } from '../ui'
import styles from '../admin.module.css'

const DEFAULT_SLOTS = ['splash_hero', 'home_matcha', 'product_matcha', 'product_spanish_latte', 'product_cascara_orange', 'reward_free_drink', 'reward_secret_menu', 'reward_credit', 'brand_story', 'club_hero', 'profile_mascot']
const MAX_BYTES = 12 * 1024 * 1024

export default function MediaModule({ supabase, notify, fail }: ModuleProps) {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ slot_key: '', title: '', description: '', alt_text: '' })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('cms_media').select('*').order('sort_order').order('title')
    if (error) fail(error.message); else setMedia((data as Media[]) ?? [])
    setLoading(false)
  }, [supabase, fail])

  useEffect(() => { load() }, [load])

  function pick(e: ChangeEvent<HTMLInputElement>) { setFile(e.target.files?.[0] ?? null) }

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      if (!form.slot_key.trim() || !form.title.trim()) throw new Error('Slot key and title are required.')
      if (!file) throw new Error('Choose an image first.')
      if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.')
      if (file.size > MAX_BYTES) throw new Error('Maximum image size is 12 MB.')
      const slot = form.slot_key.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_')
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `media/${slot}/${crypto.randomUUID()}.${ext}`
      const upload = await supabase.storage.from('1718-media').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' })
      if (upload.error) throw upload.error
      const existing = media.find(m => m.slot_key === slot)
      const payload = {
        slot_key: slot, title: form.title.trim(), description: form.description.trim() || null,
        storage_path: path, public_url: null, alt_text: form.alt_text.trim() || null, active: true,
        sort_order: existing?.sort_order ?? media.length + 10,
        updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      }
      const { data, error } = await supabase.from('cms_media').upsert(payload, { onConflict: 'slot_key' }).select('*').single()
      if (error) { await supabase.storage.from('1718-media').remove([path]); throw error }
      if (existing?.storage_path && existing.storage_path !== path) await supabase.storage.from('1718-media').remove([existing.storage_path])
      setMedia(prev => [...prev.filter(m => m.slot_key !== slot), data as Media].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)))
      setForm({ slot_key: '', title: '', description: '', alt_text: '' }); setFile(null)
      const input = document.getElementById('media-file') as HTMLInputElement | null; if (input) input.value = ''
      notify('Photo saved. The customer app now uses the new image.')
    } catch (err) { fail(err instanceof Error ? err.message : 'Unable to save photo.') } finally { setSaving(false) }
  }

  async function remove(m: Media) {
    if (!confirm(`Delete “${m.title}”?`)) return
    const { error } = await supabase.from('cms_media').delete().eq('id', m.id)
    if (error) { fail(error.message); return }
    if (m.storage_path) await supabase.storage.from('1718-media').remove([m.storage_path])
    setMedia(prev => prev.filter(x => x.id !== m.id))
    notify('Photo removed. The app will fall back to its built-in artwork.')
  }

  function replace(m: Media) {
    setForm({ slot_key: m.slot_key, title: m.title, description: m.description ?? '', alt_text: m.alt_text ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <>
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div><h2 className={styles.panelTitle}>Add / replace an image</h2><p className={styles.muted}>Use the slot key shown on each card. Re-uploading the same slot replaces the live image everywhere.</p></div>
        <ImagePlus size={24} />
      </div>
      <form onSubmit={save} className={styles.formGrid}>
        <div className={styles.field}><label>Slot key</label><input required value={form.slot_key} onChange={e => setForm({ ...form, slot_key: e.target.value })} placeholder="product_spanish_latte" /></div>
        <div className={styles.field}><label>Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Product — Spanish Latte" /></div>
        <div className={styles.field}><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <div className={styles.field}><label>Alt text</label><textarea value={form.alt_text} onChange={e => setForm({ ...form, alt_text: e.target.value })} /></div>
        <div className={`${styles.field} ${styles.full}`}><label>Image file</label><input id="media-file" className={styles.file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={pick} /></div>
        <div className={styles.full}><button className={styles.btn} disabled={saving}>{saving ? <><RefreshCw size={14} /> Saving…</> : <><Upload size={14} /> Save image</>}</button></div>
      </form>
      <p className={styles.footer}>Built-in customer slots: {DEFAULT_SLOTS.join(' · ')}</p>
    </section>

    <section className={styles.panel} style={{ marginTop: 18 }}>
      <div className={styles.panelHead}>
        <div><h2 className={styles.panelTitle}>Live image library</h2><p className={styles.muted}>Each photo is a database-controlled asset. Changes appear in the customer app without changing code.</p></div>
        <span className={styles.count}>{media.length} assets</span>
      </div>
      {loading ? <Loading label="Loading media…" /> : <div className={styles.grid}>{media.map(m => (
        <article className={styles.card} key={m.id}>
          <div className={styles.preview}>{m.public_url || m.storage_path ? <img src={m.public_url || `/api/media/${encodeURIComponent(m.slot_key)}`} alt={m.alt_text || m.title} /> : <div className={styles.empty}>No image uploaded<br />using built-in artwork</div>}</div>
          <div className={styles.body}>
            <div className={styles.slot}>{m.slot_key}</div>
            <div className={styles.name}>{m.title}</div>
            {m.description && <div className={styles.muted}>{m.description}</div>}
            <div className={styles.actions}><button className={styles.smallBtn} onClick={() => replace(m)}>Replace</button><button className={`${styles.smallBtn} ${styles.smallBtnDanger}`} onClick={() => remove(m)}><Trash2 size={13} /></button></div>
          </div>
        </article>
      ))}</div>}
    </section>
  </>
}
