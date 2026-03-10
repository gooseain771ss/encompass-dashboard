'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera } from 'lucide-react'

export function TakeSnapshotButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function takeSnapshot() {
    if (!confirm('Save a net worth snapshot for today?')) return
    setLoading(true)

    // Pull current accounts
    const { data: accounts } = await supabase
      .from('personal_accounts')
      .select('id, name, account_type, balance, is_asset, is_liability, owner')
      .eq('is_active', true)

    const totalAssets = accounts?.filter(a => a.is_asset).reduce((s, a) => s + (a.balance || 0), 0) || 0
    const totalLiabilities = accounts?.filter(a => a.is_liability).reduce((s, a) => s + (a.balance || 0), 0) || 0
    const netWorth = totalAssets - totalLiabilities

    // Build breakdown
    const breakdown: Record<string, unknown> = {
      byType: {} as Record<string, number>,
      byOwner: { scott: 0, wife: 0, joint: 0 },
      accounts: accounts?.map(a => ({ id: a.id, name: a.name, balance: a.balance, type: a.account_type })),
    }
    accounts?.forEach(a => {
      const bt = breakdown.byType as Record<string, number>
      bt[a.account_type] = (bt[a.account_type] || 0) + (a.balance || 0)
      const bo = breakdown.byOwner as Record<string, number>
      if (a.is_asset) bo[a.owner] = (bo[a.owner] || 0) + (a.balance || 0)
      if (a.is_liability) bo[a.owner] = (bo[a.owner] || 0) - (a.balance || 0)
    })

    const { error } = await supabase.from('personal_net_worth_snapshots').insert({
      snapshot_date: new Date().toISOString().split('T')[0],
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: netWorth,
      breakdown,
    })

    setLoading(false)
    if (!error) {
      router.refresh()
    } else {
      alert('Error saving snapshot: ' + error.message)
    }
  }

  return (
    <button onClick={takeSnapshot} disabled={loading} className="btn-secondary">
      <Camera className="w-4 h-4" />
      {loading ? 'Saving…' : 'Take Snapshot'}
    </button>
  )
}
