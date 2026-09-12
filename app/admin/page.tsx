'use client'

import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Check, ImagePlus, LogOut, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { createClient } from '../../lib/supabase/client'
import styles from './admin.module.css'

type Media = { id:string; slot_key:string; title:string; description:string|null; storage_path:string|null; public_url:string|null; alt_text:string|null; active:boolean; sort_order:number; updated_at:string }
const DEFAULT_SLOTS = ['splash_hero','home_matcha','product_matcha','product_spanish_latte','product_cascara_orange','reward_free_drink','reward_secret_menu','reward_credit','brand_story','club_hero','profile_mascot']

export default function AdminPage(){
  const supabase=createClient()
  const [loading,setLoading]=useState(true); const [authorized,setAuthorized]=useState(false); const [email,setEmail]=useState(''); const [sent,setSent]=useState(false); const [error,setError]=useState(''); const [media,setMedia]=useState<Media[]>([]); const [notice,setNotice]=useState(''); const [activeTab,setActiveTab]=useState('Media');
  const [form,setForm]=useState({slot_key:'',title:'',description:'',alt_text:''}); const [file,setFile]=useState<File|null>(null); const [saving,setSaving]=useState(false)

  async function load(){
    setLoading(true); setError('')
    const {data:{session}}=await supabase.auth.getSession()
    if(!session){setAuthorized(false);setLoading(false);return}
    const {data:isAdmin,error:adminError}=await supabase.rpc('is_cms_admin')
    if(adminError||!isAdmin){setAuthorized(false);setError('This account is not authorized for the 1718 CMS.');setLoading(false);return}
    setAuthorized(true)
    const {data,error:mediaError}=await supabase.from('cms_media').select('*').order('sort_order').order('title')
    if(mediaError)setError(mediaError.message); else setMedia(data??[])
    setLoading(false)
  }
  useEffect(()=>{load()},[])

  async function signIn(e:FormEvent){e.preventDefault();setError('');setNotice('');
    const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:`${window.location.origin}/admin`}})
    if(error)setError(error.message);else setSent(true)
  }
  async function signOut(){await supabase.auth.signOut();setAuthorized(false);setSent(false)}
  function pick(e:ChangeEvent<HTMLInputElement>){setFile(e.target.files?.[0]??null)}

  async function saveMedia(e:FormEvent){e.preventDefault();setSaving(true);setError('');setNotice('')
    try{
      if(!form.slot_key.trim()||!form.title.trim()) throw new Error('Slot key and title are required.')
      if(!file) throw new Error('Choose an image first.')
      if(!file.type.startsWith('image/')) throw new Error('Only image files are allowed.')
      if(file.size>12*1024*1024) throw new Error('Maximum image size is 12 MB.')
      const slot=form.slot_key.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'_')
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
      const path=`media/${slot}/${crypto.randomUUID()}.${ext}`
      const upload=await supabase.storage.from('1718-media').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'31536000'})
      if(upload.error)throw upload.error
      const existing=media.find(m=>m.slot_key===slot)
      const payload={slot_key:slot,title:form.title.trim(),description:form.description.trim()||null,storage_path:path,public_url:null,alt_text:form.alt_text.trim()||null,active:true,sort_order:existing?.sort_order??(media.length+10),updated_by:(await supabase.auth.getUser()).data.user?.id??null}
      const {data,error}=await supabase.from('cms_media').upsert(payload,{onConflict:'slot_key'}).select('*').single()
      if(error){await supabase.storage.from('1718-media').remove([path]);throw error}
      if(existing?.storage_path&&existing.storage_path!==path) await supabase.storage.from('1718-media').remove([existing.storage_path])
      setMedia(prev=>[...prev.filter(m=>m.slot_key!==slot),data].sort((a,b)=>a.sort_order-b.sort_order||a.title.localeCompare(b.title)))
      setForm({slot_key:'',title:'',description:'',alt_text:''});setFile(null);setNotice('Photo saved. The customer app now uses the new image.');
      const input=document.getElementById('media-file') as HTMLInputElement|null;if(input)input.value=''
    }catch(err){setError(err instanceof Error?err.message:'Unable to save photo.')}finally{setSaving(false)}
  }
  async function remove(m:Media){if(!confirm(`Delete “${m.title}”?`))return;setError('');setNotice('');
    const {error}=await supabase.from('cms_media').delete().eq('id',m.id); if(error){setError(error.message);return}
    if(m.storage_path)await supabase.storage.from('1718-media').remove([m.storage_path]);setMedia(prev=>prev.filter(x=>x.id!==m.id));setNotice('Photo removed. The app will fall back to its built-in artwork.')
  }
  function replace(m:Media){setForm({slot_key:m.slot_key,title:m.title,description:m.description??'',alt_text:m.alt_text??''});window.scrollTo({top:0,behavior:'smooth'})}

  if(loading)return <main className={styles.shell}><div className={styles.wrap}><p className={styles.sub}>Loading 1718 CMS…</p></div></main>
  if(!authorized)return <main className={styles.shell}><section className={styles.login}><div className={styles.logo}>17<span>18</span> CLUB</div><p className={styles.eyebrow}>PRIVATE ADMINISTRATION</p><h1 className={styles.title}>1718 CMS</h1><p className={styles.sub}>Manage every image used by the Club experience. Sign in with your authorized 1718 admin email.</p>{sent?<><div className={styles.notice}>Magic link sent. Open it on this device, then return to /admin.</div><button className={`${styles.btn} ${styles.btnGhost}`} onClick={()=>setSent(false)}>Use another email</button></>:<form onSubmit={signIn}><div className={styles.field}><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@1718cafe.com" /></div><button className={styles.btn}>Send secure sign-in link</button></form>}{error&&<div className={styles.error}>{error}</div>}<p className={styles.footer}>CMS access is protected by Supabase Auth + database RLS. Uploads are stored outside the application bundle.</p></section></main>

  return <main className={styles.shell}><div className={styles.wrap}><header className={styles.header}><div><p className={styles.eyebrow}>1718 CLUB · ADMIN</p><h1 className={styles.title}>Content Studio</h1><p className={styles.sub}>Control the visual identity of every customer-facing screen without redeploying the app.</p></div><div className={styles.row}><button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}><RefreshCw size={14}/> Refresh</button><button className={styles.btn} onClick={signOut}><LogOut size={14}/> Sign out</button></div></header>
  <div className={styles.tabs}>{['Media','Products','Rewards','Club','Members','Campaigns','Audit'].map(tab=><button key={tab} className={`${styles.tab} ${activeTab===tab?styles.tabActive:''}`} onClick={()=>setActiveTab(tab)}>{tab}</button>)}</div>
  {activeTab!=='Media'?<section className={styles.panel}><h2 className={styles.panelTitle}>{activeTab}</h2><p className={styles.sub}>This CMS is structured for the next operational layer. Media management is live now; the remaining modules are ready to connect to the existing Supabase loyalty tables without exposing customer data to the browser.</p></section>:<>
  {notice&&<div className={styles.notice}><Check size={15}/> {notice}</div>}{error&&<div className={styles.error}><X size={15}/> {error}</div>}
  <section className={styles.panel}>
    <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Add / replace an image</h2><p className={styles.muted}>Use the slot key shown on each card. Re-uploading the same slot replaces the live image everywhere.</p></div><ImagePlus size={24}/></div>
    <form onSubmit={saveMedia} className={styles.formGrid}><div className={styles.field}><label>Slot key</label><input required value={form.slot_key} onChange={e=>setForm({...form,slot_key:e.target.value})} placeholder="product_spanish_latte" /></div><div className={styles.field}><label>Title</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Product — Spanish Latte" /></div><div className={styles.field}><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div><div className={styles.field}><label>Alt text</label><textarea value={form.alt_text} onChange={e=>setForm({...form,alt_text:e.target.value})}/></div><div className={`${styles.field} ${styles.full}`}><label>Image file</label><input id="media-file" className={styles.file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={pick} /></div><div className={styles.full}><button className={styles.btn} disabled={saving}>{saving?<><RefreshCw size={14}/> Saving…</>:<><Upload size={14}/> Save image</>}</button></div></form>
    <p className={styles.footer}>Built-in customer slots: {DEFAULT_SLOTS.join(' · ')}</p>
  </section>
  <section className={styles.panel} style={{marginTop:18}}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Live image library</h2><p className={styles.muted}>Each photo is a database-controlled asset. Changes appear in the customer app without changing code.</p></div><span className={styles.count}>{media.length} assets</span></div><div className={styles.grid}>{media.map(m=><article className={styles.card} key={m.id}><div className={styles.preview}>{m.public_url||m.storage_path?<img src={m.public_url||`/api/media/${encodeURIComponent(m.slot_key)}`} alt={m.alt_text||m.title}/>:<div className={styles.empty}>No image uploaded<br/>using built-in artwork</div>}</div><div className={styles.body}><div className={styles.slot}>{m.slot_key}</div><div className={styles.name}>{m.title}</div>{m.description&&<div className={styles.muted}>{m.description}</div>}<div className={styles.actions}><button className={styles.smallBtn} onClick={()=>replace(m)}>Replace</button><button className={`${styles.smallBtn} ${styles.smallBtnDanger}`} onClick={()=>remove(m)}><Trash2 size={13}/></button></div></div></article>)}</div></section></>}
  <footer className={styles.footer}>1718 CLUB Content Studio · Supabase Storage + RLS · Images are versioned by unique storage paths so replacing a photo never exposes half-uploaded files.</footer></div></main>
}
