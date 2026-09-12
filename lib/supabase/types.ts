export type ClubSnapshot = {
  profile: { id: string; full_name: string | null; phone: string | null; email: string | null } | null
  membership: { id: string; tier_id: string; status: string } | null
  balance: number
}
