import type { SupabaseClient } from '@supabase/supabase-js'

export async function getFamilyId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from('family_members')
    .select('family_id')
    .maybeSingle()
  return data?.family_id ?? null
}
