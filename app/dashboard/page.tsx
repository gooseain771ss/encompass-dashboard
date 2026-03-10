import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, getQuoteStatusColor, getQuoteStatusLabel, getAircraftStatusColor, getAircraftStatusLabel } from '@/lib/utils'
import { Plane, DollarSign, Calendar, Users, TrendingUp, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export default async function DashboardPage() {
  const supabase = createClient()

  // Parallel data fetching
  const [
    { data: aircraft },
    { data: recentQuotes },
    { data: upcomingTrips },
    { data: overdueMaintenance },
    { data: openSquawks },
    { data: currentMonthRevenue },
    { data: pendingBrokerRequests },
    { data: pilots },
  ] = await Promise.all([
    supabase.from('aircraft').select('*').order('name'),
    supabase.from('quotes').select('*, aircraft(name, registration)').order('created_at', { ascending: false }).limit(5),
    supabase.from('quotes')
      .select('*, aircraft(name, registration)')
      .in('status', ['scheduled', 'accepted'])
      .gte('departure_date', format(new Date(), 'yyyy-MM-dd'))
      .order('departure_date')
      .limit(10),
    supabase.from('maintenance_items')
      .select('*, aircraft(name, registration)')
      .eq('status', 'overdue')
      .limit(5),
    supabase.from('squawks')
      .select('*, aircraft(name, registration)')
      .in('status', ['open'])
      .eq('grounding', true)
      .limit(5),
    supabase.from('transactions')
      .select('amount, is_income')
      .gte('transaction_date', format(startOfMonth(new Date()), 'yyyy-MM-dd'))
      .lte('transaction_date', format(endOfMonth(new Date()), 'yyyy-MM-dd')),
    supabase.from('broker_requests')
      .select('*')
      .eq('status', 'pending')
      .limit(5),
    supabase.from('pilots').select('*').eq('status', 'staff'),
  ])

  // Calculate stats
  const revenue = currentMonthRevenue?.filter(t => t.is_income).reduce((s, t) => s + t.amount, 0) || 0
  const expenses = currentMonthRevenue?.filter(t => !t.is_income).reduce((s, t) => s + Math.abs(t.amount), 0) || 0
  const profit = revenue - expenses

  const availableAircraft = aircraft?.filter(a => a.status === 'available').length || 0
  const totalAircraft = aircraft?.length || 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Link href="/dashboard/trips/new" className="btn-primary">
          <Calendar className="w-4 h-4" />
          New Quote
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">MTD Revenue</p>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(revenue)}</p>
          <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)} net
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fleet Status</p>
            <Plane className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{availableAircraft}/{totalAircraft}</p>
          <p className="text-xs text-muted-foreground">aircraft available</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming Trips</p>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{upcomingTrips?.length || 0}</p>
          <p className="text-xs text-muted-foreground">scheduled ahead</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pilot Roster</p>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{pilots?.length || 0}</p>
          <p className="text-xs text-muted-foreground">staff pilots</p>
        </div>
      </div>

      {/* Alerts row */}
      {((overdueMaintenance?.length || 0) > 0 || (openSquawks?.length || 0) > 0 || (pendingBrokerRequests?.length || 0) > 0) && (
        <div className="flex flex-wrap gap-3">
          {(overdueMaintenance?.length || 0) > 0 && (
            <Link href="/dashboard/fleet" className="flex items-center gap-2 bg-red-950/50 border border-red-800/50 text-red-300 text-sm px-3 py-2 rounded-lg hover:bg-red-950 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              {overdueMaintenance!.length} overdue maintenance item{overdueMaintenance!.length !== 1 ? 's' : ''}
            </Link>
          )}
          {(openSquawks?.length || 0) > 0 && (
            <Link href="/dashboard/fleet" className="flex items-center gap-2 bg-red-950/50 border border-red-800/50 text-red-300 text-sm px-3 py-2 rounded-lg hover:bg-red-950 transition-colors">
              <AlertTriangle className="w-4 h-4" />
              {openSquawks!.length} grounding squawk{openSquawks!.length !== 1 ? 's' : ''}
            </Link>
          )}
          {(pendingBrokerRequests?.length || 0) > 0 && (
            <Link href="/dashboard/avinode" className="flex items-center gap-2 bg-amber-950/50 border border-amber-800/50 text-amber-300 text-sm px-3 py-2 rounded-lg hover:bg-amber-950 transition-colors">
              <Clock className="w-4 h-4" />
              {pendingBrokerRequests!.length} Avinode request{pendingBrokerRequests!.length !== 1 ? 's' : ''} awaiting review
            </Link>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Fleet Status */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="section-header">Fleet Status</h2>
            <Link href="/dashboard/fleet" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {aircraft?.map(ac => (
              <Link
                key={ac.id}
                href={`/dashboard/fleet/${ac.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center justify-center w-9 h-9 bg-primary/10 rounded-lg">
                  <Plane className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{ac.name}</p>
                  <p className="text-xs text-muted-foreground">{ac.registration} · Based {ac.base_icao}</p>
                </div>
                <div className="text-right">
                  <span className={`badge-status text-xs ${getAircraftStatusColor(ac.status)}`}>
                    {getAircraftStatusLabel(ac.status)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">{ac.airframe_hours.toFixed(1)} AF hrs</p>
                </div>
              </Link>
            ))}
            {(!aircraft || aircraft.length === 0) && (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">No aircraft configured</div>
            )}
          </div>
        </div>

        {/* Upcoming Trips */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="section-header">Upcoming Trips</h2>
            <Link href="/dashboard/trips" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingTrips?.map(trip => (
              <Link
                key={trip.id}
                href={`/dashboard/trips/${trip.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="text-center min-w-[44px]">
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(new Date(trip.departure_date), 'MMM')}
                  </p>
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {format(new Date(trip.departure_date), 'd')}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {trip.origin_icao} → {trip.destination_icao}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {(trip.aircraft as any)?.name || 'No aircraft'} · {trip.customer_name || 'No customer'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`badge-status ${getQuoteStatusColor(trip.status)}`}>
                    {getQuoteStatusLabel(trip.status)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(trip.total_price)}</p>
                </div>
              </Link>
            ))}
            {(!upcomingTrips || upcomingTrips.length === 0) && (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                No upcoming trips scheduled
              </div>
            )}
          </div>
        </div>

        {/* Recent Quotes */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="section-header">Recent Quotes</h2>
            <Link href="/dashboard/trips" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentQuotes?.map(quote => (
              <Link
                key={quote.id}
                href={`/dashboard/trips/${quote.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-primary">{quote.quote_number}</p>
                    <span className={`badge-status ${getQuoteStatusColor(quote.status)}`}>
                      {getQuoteStatusLabel(quote.status)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5">
                    {quote.origin_icao} → {quote.destination_icao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quote.customer_name || 'No customer'} · {formatDate(quote.departure_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(quote.total_price)}</p>
                  <p className="text-xs text-muted-foreground">{quote.pax_count} pax</p>
                </div>
              </Link>
            ))}
            {(!recentQuotes || recentQuotes.length === 0) && (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">No quotes yet</div>
            )}
          </div>
        </div>

        {/* Maintenance Alerts */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="section-header">Maintenance Alerts</h2>
            <Link href="/dashboard/fleet" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {overdueMaintenance?.map(item => (
              <Link
                key={item.id}
                href={`/dashboard/fleet/${item.aircraft_id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 bg-red-950/50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {(item.aircraft as any)?.name} · Due {formatDate(item.due_date)}
                  </p>
                </div>
                <span className="badge-status bg-red-900 text-red-200 text-xs">Overdue</span>
              </Link>
            ))}
            {(!overdueMaintenance || overdueMaintenance.length === 0) && (
              <div className="px-5 py-8 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <p className="text-muted-foreground text-sm">All maintenance up to date</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
