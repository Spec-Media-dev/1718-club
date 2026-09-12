import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ authenticated: false }, { status: 401 })

    const [{ data: profile, error: profileError }, { data: membership, error: membershipError }, { data: account, error: accountError }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,phone,locale,referral_code').eq('id', user.id).maybeSingle(),
      supabase.from('memberships').select('status,joined_at,membership_tiers(code,name,min_points,invitation_only,benefits)').eq('profile_id', user.id).maybeSingle(),
      supabase.from('loyalty_accounts').select('id,status,lifetime_earned,created_at').eq('profile_id', user.id).maybeSingle(),
    ])

    if (profileError || membershipError || accountError) {
      return NextResponse.json({ error: 'Unable to load Club profile.' }, { status: 500 })
    }
    if (!profile || !account) return NextResponse.json({ error: 'Club account is not ready.' }, { status: 409 })

    const { data: pointsRows, error: ledgerError } = await supabase.from('points_ledger').select('amount,entry_type,source_type,description,expires_at,created_at').eq('account_id', account.id).order('created_at', { ascending: false }).limit(50)
    if (ledgerError) return NextResponse.json({ error: 'Unable to load Club balance.' }, { status: 500 })

    const points = (pointsRows ?? []).filter(row => !row.expires_at || new Date(row.expires_at) > new Date()).reduce((sum, row) => sum + row.amount, 0)
    const tier = Array.isArray(membership?.membership_tiers) ? membership.membership_tiers[0] : membership?.membership_tiers

    return NextResponse.json({
      authenticated: true,
      profile,
      membership: membership ? { status: membership.status, joined_at: membership.joined_at, tier } : null,
      account: { id: account.id, status: account.status, lifetime_earned: account.lifetime_earned, points },
      ledger: pointsRows ?? [],
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Club service unavailable.' }, { status: 500 })
  }
}
