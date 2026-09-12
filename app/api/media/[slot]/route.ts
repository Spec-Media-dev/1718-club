import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET(_request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params
  const key = decodeURIComponent(slot)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cms_media')
    .select('public_url,storage_path')
    .eq('slot_key', key)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return new NextResponse(null, { status: 404 })

  const redirectHeaders = { 'Cache-Control': 'public, max-age=60' }

  if (data.public_url) {
    return NextResponse.redirect(data.public_url, { status: 307, headers: redirectHeaders })
  }

  if (data.storage_path) {
    const { data: publicData } = supabase.storage.from('1718-media').getPublicUrl(data.storage_path)
    if (publicData.publicUrl) {
      return NextResponse.redirect(publicData.publicUrl, { status: 307, headers: redirectHeaders })
    }
  }

  return new NextResponse(null, { status: 404 })
}
