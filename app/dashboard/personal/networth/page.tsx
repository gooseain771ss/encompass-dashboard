import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TakeSnapshotButton } from '@/components/personal/TakeSnapshotButton'
import { NetWorthChart } from '@/components/personal/NetWorthChart'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

export default async function PersonalNetWorthPage() {
  const supabase = createClient()

  const [{ data: snapshots }, { data: accounts }] = await Promise.all([
    supabase
      .from('personal_net_worth_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: true })
      .limit(120),
    supabase
      .from('personal_accounts')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),
  ])

  const assets = accounts?.filter(a => a.is_asset) || []
  const liabilities = accounts?.filter(a => a.is_liability) || []
  const totalAssets = assets.reduce((s, a) => s + (a.balance || 0), 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + (a.balance || 0), 0)
  const liveNetWorth = totalAssets - totalLiabilities

  // Group assets by type
  const assetsByType: Record<string, number> = {}
  assets.forEach(a => {
    assetsByType[a.account_type] = (assetsByType[a.account_type] || 0) + (a.balance || 0)
  })
  const liabsByType: Record<string, number> = {}
  liabilities.forEach(a => {
    liabsByType[a.account_type] = (liabsByType[a.account_type] || 0) + (a.balance || 0)
  })

  const typeLabels: Record<string, string> = {
    checking: 'Checking', savings: 'Savings', credit_card: 'Credit Card',
    investment: 'Investment', mortgage: 'Mortgage', loan: 'Loan',
    property: 'Property', vehicle: 'Vehicle', other: 'Other',
  }

  // Net worth change vs last snapshot
  const prevSnapshot = snapshots && snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null
  const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
  const nwChange = prevSnapshot ? liveNetWorth - prevSnapshot.net_worth : null

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Net Worth</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {latestSnapshot
              ? `Last snapshot: ${formatDate(latestSnapshot.snapshot_date)}`
              : 'No snapshots yet — take your first one!'}
          </p>
        </div>
        <TakeSnapshotButton />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card border-emerald-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Assets</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAssets)}</p>
          <p className="text-xs text-muted-foreground">{assets.length} accounts</p>
        </div>
        <div className="stat-card border-red-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Liabilities</p>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalLiabilities)}</p>
          <p className="text-xs text-muted-foreground">{liabilities.length} accounts</p>
        </div>
        <div className={`stat-card ${liveNetWorth >= 0 ? 'border-primary/30' : 'border-red-800/30'}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Worth</p>
            <Wallet className={`w-4 h-4 ${liveNetWorth >= 0 ? 'text-primary' : 'text-red-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${liveNetWorth >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {formatCurrency(liveNetWorth)}
          </p>
          {nwChange !== null && (
            <p className={`text-xs font-medium ${nwChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {nwChange >= 0 ? '+' : ''}{formatCurrency(nwChange)} since last snapshot
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="section-header mb-4">Net Worth Over Time</h2>
        {(snapshots?.length || 0) < 2 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm text-center">
            <div>
              <p className="mb-2">Take at least 2 snapshots to see a chart.</p>
              <TakeSnapshotButton />
            </div>
          </div>
        ) : (
          <NetWorthChart data={snapshots || []} />
        )}
      </div>

      {/* Breakdown */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-emerald-400 mb-4">Assets by Type</h2>
          {Object.keys(assetsByType).length === 0 ? (
            <p className="text-sm text-muted-foreground">No asset accounts yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(assetsByType).sort((a, b) => b[1] - a[1]).map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{typeLabels[type] || type}</span>
                    <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: totalAssets > 0 ? `${(amount / totalAssets) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalAssets > 0 ? Math.round((amount / totalAssets) * 100) : 0}% of assets
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-red-400 mb-4">Liabilities by Type</h2>
          {Object.keys(liabsByType).length === 0 ? (
            <p className="text-sm text-muted-foreground">No liability accounts yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(liabsByType).sort((a, b) => b[1] - a[1]).map(([type, amount]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{typeLabels[type] || type}</span>
                    <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: totalLiabilities > 0 ? `${(amount / totalLiabilities) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalLiabilities > 0 ? Math.round((amount / totalLiabilities) * 100) : 0}% of liabilities
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Snapshot history */}
      {(snapshots?.length || 0) > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="section-header text-base">Snapshot History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Assets</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Liabilities</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Net Worth</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...(snapshots || [])].reverse().map((snap, idx, arr) => {
                  const prev = arr[idx + 1]
                  const change = prev ? snap.net_worth - prev.net_worth : null
                  return (
                    <tr key={snap.id} className="table-row-hover">
                      <td className="px-4 py-2.5 text-sm text-muted-foreground">{formatDate(snap.snapshot_date)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-emerald-400 font-medium">{formatCurrency(snap.total_assets)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-red-400 font-medium">{formatCurrency(snap.total_liabilities)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-primary font-semibold">{formatCurrency(snap.net_worth)}</td>
                      <td className={`px-4 py-2.5 text-right text-sm font-medium ${change == null ? 'text-muted-foreground' : change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {change == null ? '—' : `${change >= 0 ? '+' : ''}${formatCurrency(change)}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
