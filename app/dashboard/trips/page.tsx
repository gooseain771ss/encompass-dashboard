import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, getQuoteStatusColor, getQuoteStatusLabel } from '@/lib/utils'
import { Plus, Search, Filter, Calendar, Plane, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { QuoteStatusFilter } from '@/components/trips/QuoteStatusFilter'
import { format } from 'date-fns'

interface SearchParams {
  status?: string
  search?: string
  aircraft?: string
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createClient()

  let query = supabase
    .from('quotes')
    .select('*, aircraft(name, registration, aircraft_type)')
    .order('created_at', { ascending: false })

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status)
  }
  if (searchParams.aircraft) {
    query = query.eq('aircraft_id', searchParams.aircraft)
  }
  if (searchParams.search) {
    query = query.or(
      `quote_number.ilike.%${searchParams.search}%,customer_name.ilike.%${searchParams.search}%,origin_icao.ilike.%${searchParams.search}%,destination_icao.ilike.%${searchParams.search}%`
    )
  }

  const [{ data: quotes }, { data: aircraft }] = await Promise.all([
    query.limit(100),
    supabase.from('aircraft').select('id, name, registration').order('name'),
  ])

  // Pipeline counts
  const { data: statusCounts } = await supabase
    .from('quotes')
    .select('status')

  const counts = statusCounts?.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const pipeline = [
    { status: 'draft', label: 'Draft', count: counts['draft'] || 0 },
    { status: 'sent', label: 'Sent', count: counts['sent'] || 0 },
    { status: 'accepted', label: 'Accepted', count: counts['accepted'] || 0 },
    { status: 'scheduled', label: 'Scheduled', count: counts['scheduled'] || 0 },
    { status: 'completed', label: 'Completed', count: counts['completed'] || 0 },
    { status: 'invoiced', label: 'Invoiced', count: counts['invoiced'] || 0 },
    { status: 'paid', label: 'Paid', count: counts['paid'] || 0 },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trips & Quotes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {quotes?.length || 0} quote{quotes?.length !== 1 ? 's' : ''} shown
          </p>
        </div>
        <Link href="/dashboard/trips/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Quote
        </Link>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {pipeline.map((stage, i) => (
          <Link
            key={stage.status}
            href={`/dashboard/trips?status=${stage.status}`}
            className={`bg-card border rounded-xl p-3 text-center hover:border-primary/40 transition-colors ${
              searchParams.status === stage.status ? 'border-primary/60 bg-primary/5' : 'border-border'
            }`}
          >
            {i > 0 && (
              <div className="hidden lg:flex justify-center mb-1">
                <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
              </div>
            )}
            <p className="text-xl font-bold text-foreground">{stage.count}</p>
            <p className="text-xs text-muted-foreground truncate">{stage.label}</p>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            name="search"
            defaultValue={searchParams.search}
            placeholder="Search quotes..."
            className="input-base pl-9 w-56"
          />
          {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        </form>

        <div className="flex gap-2 flex-wrap">
          <Link
            href="/dashboard/trips"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              !searchParams.status || searchParams.status === 'all'
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}
          >
            All
          </Link>
          {['draft', 'sent', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid'].map(s => (
            <Link
              key={s}
              href={`/dashboard/trips?status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                searchParams.status === s
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Quote #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Route</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Aircraft</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotes?.map(quote => (
                <tr key={quote.id} className="table-row-hover">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/trips/${quote.id}`} className="text-sm font-mono text-primary hover:underline">
                      {quote.quote_number}
                    </Link>
                    {quote.is_empty_leg && (
                      <span className="ml-2 text-xs bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded">Empty Leg</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-foreground">
                      <span className="font-medium">{quote.origin_icao}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{quote.destination_icao}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{quote.pax_count} pax{quote.is_round_trip ? ' · RT' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{quote.customer_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{quote.customer_email || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {formatDate(quote.departure_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-foreground">{(quote.aircraft as any)?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge-status ${getQuoteStatusColor(quote.status)}`}>
                      {getQuoteStatusLabel(quote.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(quote.total_price)}</p>
                    {quote.flight_time_hrs && (
                      <p className="text-xs text-muted-foreground">{quote.flight_time_hrs?.toFixed(1)}h</p>
                    )}
                  </td>
                </tr>
              ))}
              {(!quotes || quotes.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No quotes found</p>
                    <Link href="/dashboard/trips/new" className="text-primary text-sm hover:underline mt-1 inline-block">
                      Create your first quote →
                    </Link>
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
