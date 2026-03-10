'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBrokerStatus(
  requestId: string,
  status: string,
  bidAmount?: number
): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, any> = { status }
  if (bidAmount) {
    updates.bid_amount = bidAmount
    updates.bid_submitted_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('broker_requests')
    .update(updates)
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/avinode')
  return {}
}
