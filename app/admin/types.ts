import type { SupabaseClient } from '@supabase/supabase-js'

export type ModuleProps = {
  supabase: SupabaseClient
  notify: (message: string) => void
  fail: (message: string) => void
}

export type TierCode = 'member' | 'gold' | 'black'

export type Media = {
  id: string; slot_key: string; title: string; description: string | null
  storage_path: string | null; public_url: string | null; alt_text: string | null
  active: boolean; sort_order: number; updated_at: string
}

export type Reward = {
  id: string; name: string; description: string | null; points_cost: number
  tier_code: TierCode | null; active: boolean; secret: boolean
  inventory_limit: number | null; valid_from: string | null; valid_until: string | null
}

export type Tier = {
  id: string; code: TierCode; name: string; min_points: number
  invitation_only: boolean; active: boolean; sort_order: number
  benefits: Record<string, unknown> | null
}

export type Campaign = {
  id: string; name: string; description: string | null; multiplier: number
  starts_at: string; ends_at: string; active: boolean; rules: Record<string, unknown> | null
}

export type Product = {
  id: string; name: string; slug: string | null; category: string; description: string | null
  price: number; currency: string; image_slot: string | null; badge: string | null
  tone: string | null; available: boolean; active: boolean; sort_order: number
}

export type MemberRow = {
  id: string; full_name: string | null; email: string | null; phone: string | null
  created_at: string; referral_code: string | null
}

export type AuditRow = {
  id: string; actor_id: string | null; action: string; entity_type: string
  entity_id: string | null; metadata: Record<string, unknown> | null; created_at: string
}
