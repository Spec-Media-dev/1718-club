import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase/server'

const schema = z.object({
  items: z.array(z.object({ id: z.number(), qty: z.number().int().min(1).max(50) })).min(1).max(100),
  order_type: z.enum(['pickup', 'delivery']),
  customer_name: z.string().max(120).optional().default(''),
  phone: z.string().max(40).optional().default(''),
  address: z.string().max(400).optional().default(''),
  note: z.string().max(400).optional().default(''),
  payment_method: z.enum(['cash', 'instapay']),
})

type MenuItem = { id: number; name: string; price: number }
let MENU: MenuItem[] | null = null
function menuItems(): MenuItem[] {
  if (!MENU) {
    const raw = JSON.parse(readFileSync(join(process.cwd(), 'public/data/menu.json'), 'utf8')) as { items: MenuItem[] }
    MENU = raw.items
  }
  return MENU
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid order.' }, { status: 400 })
    const b = parsed.data

    // Server-side price validation — never trust client prices.
    const priceMap = new Map(menuItems().map(i => [i.id, i]))
    let subtotal = 0
    const lines: { id: number; name: string; price: number; qty: number }[] = []
    for (const it of b.items) {
      const m = priceMap.get(it.id)
      if (!m) return NextResponse.json({ error: 'Unknown item on the order.' }, { status: 400 })
      subtotal += m.price * it.qty
      lines.push({ id: m.id, name: m.name, price: m.price, qty: it.qty })
    }
    if (b.order_type === 'delivery' && b.address.trim().length < 5) return NextResponse.json({ error: 'A delivery address is required.' }, { status: 400 })

    const delivery_fee = b.order_type === 'delivery' ? 30 : 0
    const total = subtotal + delivery_fee
    const code = 'C' + Math.random().toString(36).slice(2, 6).toUpperCase()

    const supabase = await createClient()
    const { error } = await supabase.from('orders').insert({
      code, order_type: b.order_type, items: lines, subtotal, delivery_fee, total,
      customer_name: b.customer_name || null, phone: b.phone || null, address: b.address || null,
      note: b.note || null, payment_method: b.payment_method,
    })
    if (error) return NextResponse.json({ error: 'Could not place the order. Please try again.' }, { status: 500 })

    return NextResponse.json({ code, total }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
}
