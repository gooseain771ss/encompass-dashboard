import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency, getBrokerRequestStatusColor, getFitScoreColor } from '@/lib/utils'
import { AvinodeEmailParser } from '@/components/avinode/AvinodeEmailParser'
import { Mail, TrendingUp, Target, Award } from 'lucide-react'

export default async function AvinodePage() {
  const supabase = createClient()

  const [{ data: requests }, { data: aircraft }] = await Promise.all([
    supabase
      .from('broker_requests')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(50),
    supabase.from('aircraft').select('*').order('name'),
  ])

  // Win/loss stats
  const won = requests?.filter(r => r.status === 'won').length || 0
  const lost = requests?.filter(r => r.status === 'lost').length || 0
  const submitted = requests?.filter(r => r.status === 'bid_submitted').length || 0
  const total = requests?.filter(r => ['won', 'lost'].includes(r.status)).length || 0
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0

  // Average fit score
  const avgScore = requests && requests.length > 0
    ? Math.round(requests.filter(r => r.fit_score).reduce((s, r) => s + (r.fit_score || 0), 0) / requests.filter(r => r.fit_score).length * 10) / 10
    : 0

  const statusLabels: Record<string, string> = {
    pending: 'Pending Review',
    bid_submitted: 'Bid Submitted',
    won: 'Won',
    lost: 'Lost',
    passed: 'Passed',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avinode Intelligence</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Analyze broker requests, score trip fit, and optimize bid pricing
          </p>
        </div>
        <AvinodeEmailParser aircraft={aircraft || []} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Win Rate</p>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{winRate}%</p>
          <p className="text-xs text-muted-foreground">{won}W / {lost}L</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Fit Score</p>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <p className={`text-2xl font-bold ${getFitScoreColor(avgScore)}`}>{avgScore || '—'}</p>
          <p className="text-xs text-muted-foreground">out of 10</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Review</p>
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {requests?.filter(r => r.status === 'pending').length || 0}
          </p>
          <p className="text-xs text-muted-foreground">awaiting decision</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bids Out</p>
            <Award className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{submitted}</p>
          <p className="text-xs text-muted-foreground">awaiting response</p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="section-header">Broker Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Route</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Details</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Fit Score</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Suggested Bid</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Budget</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests?.map(req => (
                <tr key={req.id} className="table-row-hover">
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(req.received_at)}
                  </td>
                  <td className="px-4 py-3">
                    {req.origin_icao && req.destination_icao ? (
                      <p className="text-sm font-medium text-foreground">
                        {req.origin_icao} → {req.destination_icao}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unknown route</p>
                    )}
                    {req.departure_date && (
                      <p className="text-xs text-muted-foreground">{formatDate(req.departure_date)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {req.pax_count && <p>{req.pax_count} pax</p>}
                      {req.requested_aircraft_type && <p>{req.requested_aircraft_type}</p>}
                      {req.client_name && <p>{req.client_name}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {req.fit_score != null ? (
                      <div>
                        <span className={`text-lg font-bold ${getFitScoreColor(req.fit_score)}`}>
                          {req.fit_score}
                        </span>
                        <span className="text-xs text-muted-foreground">/10</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {req.suggested_bid ? (
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(req.suggested_bid)}</p>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                    {req.bid_amount && (
                      <p className="text-xs text-muted-foreground">Bid: {formatCurrency(req.bid_amount)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {req.client_budget ? (
                      <p className="text-sm text-muted-foreground">{formatCurrency(req.client_budget)}</p>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge-status ${getBrokerRequestStatusColor(req.status)}`}>
                      {statusLabels[req.status] || req.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!requests || requests.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No broker requests yet</p>
                    <p className="text-sm mt-1">Click "Parse Avinode Email" to analyze your first request</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
