'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowRightLeft, ClipboardList, Package, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import type { ModuleProps } from '../types'
import styles from '../admin.module.css'

type Location = { id:string; name:string; code:string }
type Item = { id:string; sku:string|null; name:string; category:string; base_unit:string; min_stock:number; cost_per_base_unit:number; active:boolean }
type Balance = { location_id:string; inventory_item_id:string; quantity:number }
type Supplier = { id:string; name:string }

export default function InventoryModule({ supabase, notify, fail }: ModuleProps) {
  const [locations,setLocations]=useState<Location[]>([])
  const [items,setItems]=useState<Item[]>([])
  const [balances,setBalances]=useState<Balance[]>([])
  const [suppliers,setSuppliers]=useState<Supplier[]>([])
  const [location,setLocation]=useState('')
  const [tab,setTab]=useState<'stock'|'receive'|'transfer'|'adjust'>('stock')
  const [q,setQ]=useState('')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [receive,setReceive]=useState({supplier_id:'',invoice_no:'',item_id:'',quantity:'',unit:'',unit_cost:''})
  const [transfer,setTransfer]=useState({from:'',to:'',item_id:'',quantity:''})
  const [adjust,setAdjust]=useState({location_id:'',item_id:'',quantity:'',reason:'',notes:''})

  const load=useCallback(async()=>{
    setLoading(true)
    const [l,i,b,s]=await Promise.all([
      supabase.from('locations').select('id,name,code').eq('active',true).order('name'),
      supabase.from('inventory_items').select('*').eq('active',true).order('name'),
      supabase.from('inventory_balances').select('*'),
      supabase.from('suppliers').select('id,name').eq('active',true).order('name')
    ])
    const err=[l,i,b,s].find(x=>x.error)?.error
    if(err){ fail(err.message) } else {
      const ls=(l.data??[]) as Location[]; setLocations(ls); setItems((i.data??[]) as Item[]); setBalances((b.data??[]) as Balance[]); setSuppliers((s.data??[]) as Supplier[])
      if(!location && ls[0]) setLocation(ls[0].id)
      if(!transfer.from && ls.length>1) setTransfer(x=>({...x,from:ls[0].id,to:ls[1].id}))
    }
    setLoading(false)
  },[supabase,fail,location,transfer.from])
  useEffect(()=>{load()},[load])

  const rows=useMemo(()=>{
    const term=q.toLowerCase().trim()
    return items.filter(i=>!term||i.name.toLowerCase().includes(term)||(i.sku??'').toLowerCase().includes(term)).map(i=>({
      ...i, quantity:Number(balances.find(b=>b.location_id===location&&b.inventory_item_id===i.id)?.quantity??0)
    }))
  },[items,balances,location,q])

  async function ensureItem(){
    if(!receive.item_id) throw new Error('Select an inventory item.')
    const item=items.find(x=>x.id===receive.item_id); if(!item) throw new Error('Inventory item not found.')
    const qty=Number(receive.quantity), cost=Number(receive.unit_cost)
    if(!(qty>0)) throw new Error('Quantity must be greater than zero.')
    if(!(cost>=0)) throw new Error('Unit cost is required.')
    const receiptNo='GRN-'+Date.now()
    const {data:r,error:e}=await supabase.from('purchase_receipts').insert({
      receipt_no:receiptNo,supplier_id:receive.supplier_id||null,location_id:location,invoice_no:receive.invoice_no||null,status:'draft'
    }).select('id').single()
    if(e) throw e
    const {error:e2}=await supabase.from('purchase_receipt_items').insert({
      receipt_id:r.id,inventory_item_id:item.id,quantity:qty,unit:receive.unit||item.base_unit,unit_cost:cost
    })
    if(e2) throw e2
    const {error:e3}=await supabase.rpc('post_purchase_receipt',{p_receipt_id:r.id})
    if(e3) throw e3
    notify('Goods received and added to stock.')
    setReceive({supplier_id:'',invoice_no:'',item_id:'',quantity:'',unit:'',unit_cost:''}); await load()
  }

  async function doTransfer(){
    const qty=Number(transfer.quantity)
    if(!transfer.from||!transfer.to||transfer.from===transfer.to) throw new Error('Choose two different locations.')
    if(!transfer.item_id||!(qty>0)) throw new Error('Select an item and enter a valid quantity.')
    const no='TR-'+Date.now()
    const {data:r,error:e}=await supabase.from('stock_transfers').insert({transfer_no:no,from_location_id:transfer.from,to_location_id:transfer.to,status:'approved'}).select('id').single()
    if(e) throw e
    const {error:e2}=await supabase.from('stock_transfer_items').insert({transfer_id:r.id,inventory_item_id:transfer.item_id,quantity:qty})
    if(e2) throw e2
    const {error:e3}=await supabase.rpc('post_stock_transfer',{p_transfer_id:r.id})
    if(e3) throw e3
    notify('Stock transferred successfully.')
    setTransfer(x=>({...x,item_id:'',quantity:''})); await load()
  }

  async function doAdjust(){
    const qty=Number(adjust.quantity)
    if(!adjust.location_id||!adjust.item_id||!qty||!adjust.reason.trim()) throw new Error('Location, item, quantity and reason are required.')
    const no='ADJ-'+Date.now()
    const {data:r,error:e}=await supabase.from('inventory_adjustments').insert({adjustment_no:no,location_id:adjust.location_id,inventory_item_id:adjust.item_id,quantity_delta:qty,reason:adjust.reason.trim(),notes:adjust.notes||null,status:'draft'}).select('id').single()
    if(e) throw e
    const {error:e2}=await supabase.rpc('post_inventory_adjustment',{p_adjustment_id:r.id})
    if(e2) throw e2
    notify('Inventory adjustment posted.'); setAdjust(x=>({...x,quantity:'',reason:'',notes:''})); await load()
  }

  async function save(fn:()=>Promise<void>){setSaving(true);try{await fn()}catch(e){fail(e instanceof Error?e.message:'Unable to complete inventory action.')}finally{setSaving(false)}}

  if(loading) return <section className={styles.panel}><p className={styles.sub}>Loading inventory…</p></section>

  return <section className={styles.panel}>
    <div className={styles.toolbar}>
      <div><h2 className={styles.panelTitle}>Inventory</h2><p className={styles.muted}>Warehouse, store stock, receiving, transfers and adjustments.</p></div>
      <button className={styles.btnGhost} onClick={load}><RefreshCw size={14}/> Refresh</button>
    </div>
    <div className={styles.tabs}>
      {([['stock','Stock'],['receive','Receive from Supplier'],['transfer','Warehouse Transfer'],['adjust','Adjustment']] as const).map(([k,v])=><button key={k} className={`${styles.tab} ${tab===k?styles.tabActive:''}`} onClick={()=>setTab(k)}>{v}</button>)}
    </div>

    {tab==='stock' && <>
      <div className={styles.rowGrid2}>
        <div className={styles.field}><label>Location</label><select className={styles.select} value={location} onChange={e=>setLocation(e.target.value)}>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div className={styles.field}><label>Search</label><div className={styles.inputIcon}><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Product or SKU"/></div></div>
      </div>
      <div className={styles.list}>{rows.map(r=><div className={styles.listRow} key={r.id}><div className={styles.listMain}><b>{r.name}</b><span>{r.sku??'No SKU'} · {r.category} · {r.cost_per_base_unit.toLocaleString()} / {r.base_unit}</span></div><div className={styles.listMeta}><span className={r.quantity<=r.min_stock?styles.badge:styles.badgeOn}>{r.quantity.toLocaleString()} {r.base_unit}</span>{r.quantity<=r.min_stock&&<span className={styles.badge}>LOW</span>}</div></div>)}</div>
      {!rows.length&&<p className={styles.muted}>No inventory items yet.</p>}
    </>}

    {tab==='receive' && <FormCard icon={<ArrowDownToLine size={18}/>} title="Receive goods into warehouse/store" subtitle="Supplier receipt increases stock only when posted.">
      <div className={styles.rowGrid}><Field label="Supplier"><select className={styles.select} value={receive.supplier_id} onChange={e=>setReceive(x=>({...x,supplier_id:e.target.value}))}><option value="">Select supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Invoice"><input value={receive.invoice_no} onChange={e=>setReceive(x=>({...x,invoice_no:e.target.value}))}/></Field></div>
      <div className={styles.rowGrid}><Field label="Inventory item"><select className={styles.select} value={receive.item_id} onChange={e=>{const i=items.find(x=>x.id===e.target.value);setReceive(x=>({...x,item_id:e.target.value,unit:i?.base_unit??''}))}}><option value="">Select item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></Field><Field label="Quantity"><input type="number" min="0" step="0.001" value={receive.quantity} onChange={e=>setReceive(x=>({...x,quantity:e.target.value}))}/></Field><Field label="Unit"><input value={receive.unit} onChange={e=>setReceive(x=>({...x,unit:e.target.value}))}/></Field><Field label="Cost / unit"><input type="number" min="0" step="0.0001" value={receive.unit_cost} onChange={e=>setReceive(x=>({...x,unit_cost:e.target.value}))}/></Field></div>
      <button className={styles.primary} disabled={saving} onClick={()=>save(ensureItem)}><Plus size={15}/>{saving?'Posting…':'Post Receipt'}</button>
    </FormCard>}

    {tab==='transfer' && <FormCard icon={<ArrowRightLeft size={18}/>} title="Transfer stock" subtitle="Stock is deducted from the source and added to the destination atomically.">
      <div className={styles.rowGrid}><Field label="From"><select className={styles.select} value={transfer.from} onChange={e=>setTransfer(x=>({...x,from:e.target.value}))}>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field><Field label="To"><select className={styles.select} value={transfer.to} onChange={e=>setTransfer(x=>({...x,to:e.target.value}))}>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field></div>
      <div className={styles.rowGrid2}><Field label="Inventory item"><select className={styles.select} value={transfer.item_id} onChange={e=>setTransfer(x=>({...x,item_id:e.target.value}))}><option value="">Select item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></Field><Field label="Quantity"><input type="number" min="0" step="0.001" value={transfer.quantity} onChange={e=>setTransfer(x=>({...x,quantity:e.target.value}))}/></Field></div>
      <button className={styles.primary} disabled={saving} onClick={()=>save(doTransfer)}><ArrowRightLeft size={15}/>{saving?'Transferring…':'Complete Transfer'}</button>
    </FormCard>}

    {tab==='adjust' && <FormCard icon={<SlidersHorizontal size={18}/>} title="Inventory adjustment" subtitle="Use positive numbers to add stock and negative numbers to remove stock.">
      <div className={styles.rowGrid}><Field label="Location"><select className={styles.select} value={adjust.location_id} onChange={e=>setAdjust(x=>({...x,location_id:e.target.value}))}><option value="">Select location</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field><Field label="Inventory item"><select className={styles.select} value={adjust.item_id} onChange={e=>setAdjust(x=>({...x,item_id:e.target.value}))}><option value="">Select item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></Field></div>
      <div className={styles.rowGrid}><Field label="Quantity change"><input type="number" step="0.001" value={adjust.quantity} onChange={e=>setAdjust(x=>({...x,quantity:e.target.value}))}/></Field><Field label="Reason"><input value={adjust.reason} onChange={e=>setAdjust(x=>({...x,reason:e.target.value}))} placeholder="Waste, count correction, damage…"/></Field></div>
      <Field label="Notes"><textarea value={adjust.notes} onChange={e=>setAdjust(x=>({...x,notes:e.target.value}))}/></Field>
      <button className={styles.primary} disabled={saving} onClick={()=>save(doAdjust)}><ClipboardList size={15}/>{saving?'Posting…':'Post Adjustment'}</button>
    </FormCard>}
  </section>
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <div className={styles.field}><label>{label}</label>{children}</div>}
function FormCard({icon,title,subtitle,children}:{icon:React.ReactNode;title:string;subtitle:string;children:React.ReactNode}){return <div className={styles.add}><div className={styles.editorHead}><b style={{font:'600 15px Inter',color:'#0e4143',display:'flex',gap:8,alignItems:'center'}}>{icon}{title}</b><span className={styles.muted}>{subtitle}</span></div>{children}</div>}
