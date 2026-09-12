import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '../../../../lib/supabase/server'

const schema = z.object({ rewardId: z.string().uuid() })

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid reward.' }, { status: 400 })

    const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: parsed.data.rewardId })
    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('not enough') || message.includes('insufficient')) return NextResponse.json({ error: 'Not enough points.' }, { status: 409 })
      if (message.includes('unavailable') || message.includes('sold out')) return NextResponse.json({ error: 'Reward is no longer available.' }, { status: 409 })
      return NextResponse.json({ error: 'Unable to redeem reward.' }, { status: 500 })
    }

    return NextResponse.json({ redemption: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
}
