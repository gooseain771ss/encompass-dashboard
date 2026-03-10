import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, getQuoteStatusColor, getQuoteStatusLabel, getNextStatus, QUOTE_STATUS_PIPELINE } from '@/lib/utils'
import { QuoteActions } from '@/components/trips/QuoteActions'
import { Plane, User, Calendar, DollarSign, ArrowRight, Copy, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, aircraft(*)')
    .eq('id', params.id)
    .single()

  if (!quote) notFound()

  const [{ data: assignments }, { data: legs }] = await Promise.all([
    supabase
      .from('pilot_assignments')
      .select('*, pilot:pilots(*)')
      .eq('quote_id', quote.id),
    supabase
      .from('legs')
      .select('*')
      .eq('quote_id', quote.id)
      .order('leg_number'),
  ])

  const currentStepIndex = QUOTE_STATUS_PIPELINE.indexOf(quote.status as any)
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://flyencompass.com'}/portal/${quote.public_token}`

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard/trips" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              ← Trips
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground font-mono">{quote.quote_number}</h1>
            <span className={`badge-status ${getQuoteStatusColor(quote.status as any)}`}>
              {getQuoteStatusLabel(quote.status as any)}
            </span>
            {quote.is_empty_leg && (
              <span className="badge-status bg-amber-900/60 text-amber-300">Empty Leg</span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {quote.origin_icao} → {quote.destination_icao} · {formatDate(quote.departure_date)}
          </p>
        </div>
        <QuoteActions quote={quote} />
      </div>

      {/* Status Pipeline */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {QUOTE_STATUS_PIPELINE.map((stage, i) => {
            const isCompleted = i < currentStepIndex
            const isCurrent = i === currentStepIndex
            const isFuture = i > currentStepIndex
            return (
              <div key={stage} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : isCompleted
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30'
                    : 'text-muted-foreground'
                }`}>
                  {isCompleted && <span className="text-emerald-400">✓</span>}
                  {getQuoteStatusLabel(stage as any)}
                </div>
                {i < QUOTE_STATUS_PIPELINE.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route Details */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Plane className="w-4 h-4 text-primary" />
              Trip Details
            </h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="form-label mb-1">Origin</p>
                <p className="text-foreground font-semibold">{quote.origin_icao}</p>
              </div>
              <div>
                <p className="form-label mb-1">Destination</p>
                <p className="text-foreground font-semibold">{quote.destination_icao}</p>
              </div>
              <div>
                <p className="form-label mb-1">Departure</p>
                <p className="text-foreground">{formatDate(quote.departure_date)} {quote.departure_time || ''}</p>
              </div>
              {quote.return_date && (
                <div>
                  <p className="form-label mb-1">Return</p>
                  <p className="text-foreground">{formatDate(quote.return_date)} {quote.return_time || ''}</p>
                </div>
              )}
              <div>
                <p className="form-label mb-1">Passengers</p>
                <p className="text-foreground">{quote.pax_count}</p>
              </div>
              <div>
                <p className="form-label mb-1">Aircraft</p>
                <p className="text-foreground">{(quote.aircraft as any)?.name || '—'}</p>
                <p className="text-xs text-muted-foreground">{(quote.aircraft as any)?.registration}</p>
              </div>
              {quote.distance_nm && (
                <div>
                  <p className="form-label mb-1">Distance</p>
                  <p className="text-foreground">{quote.distance_nm} nm</p>
                </div>
              )}
              {quote.flight_time_hrs && (
                <div>
                  <p className="form-label mb-1">Est. Flight Time</p>
                  <p className="text-foreground">{quote.flight_time_hrs}h</p>
                </div>
              )}
            </div>
          </div>

          {/* Crew */}
          {assignments && assignments.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Crew Assignments
              </h2>
              <div className="space-y-3">
                {assignments.map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {(a.pilot as any)?.first_name} {(a.pilot as any)?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{a.role} · {a.days_estimated} day(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(a.total_cost)}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(a.daily_rate)}/day</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {(quote.notes || quote.internal_notes) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-4">Notes</h2>
              {quote.notes && (
                <div className="mb-3">
                  <p className="form-label mb-1">Customer-Facing</p>
                  <p className="text-sm text-foreground bg-muted/20 rounded-lg px-3 py-2">{quote.notes}</p>
                </div>
              )}
              {quote.internal_notes && (
                <div>
                  <p className="form-label mb-1">Internal</p>
                  <p className="text-sm text-foreground bg-muted/20 rounded-lg px-3 py-2">{quote.internal_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Customer
            </h2>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{quote.customer_name || '—'}</p>
              {quote.customer_email && (
                <p className="text-xs text-muted-foreground">{quote.customer_email}</p>
              )}
              {quote.customer_phone && (
                <p className="text-xs text-muted-foreground">{quote.customer_phone}</p>
              )}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Pricing
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base rate</span>
                <span className="text-foreground">{formatCurrency(quote.base_rate)}</span>
              </div>
              {quote.fuel_surcharge > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fuel surcharge</span>
                  <span className="text-foreground">{formatCurrency(quote.fuel_surcharge)}</span>
                </div>
              )}
              {quote.airport_fees > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Airport fees</span>
                  <span className="text-foreground">{formatCurrency(quote.airport_fees)}</span>
                </div>
              )}
              {quote.pilot_cost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pilot cost</span>
                  <span className="text-foreground">{formatCurrency(quote.pilot_cost)}</span>
                </div>
              )}
              {quote.catering_cost > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Catering</span>
                  <span className="text-foreground">{formatCurrency(quote.catering_cost)}</span>
                </div>
              )}
              {quote.ground_transport > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ground transport</span>
                  <span className="text-foreground">{formatCurrency(quote.ground_transport)}</span>
                </div>
              )}
              {quote.discount_amount > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount ({quote.discount_pct}%)</span>
                  <span>-{formatCurrency(quote.discount_amount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-primary text-lg">{formatCurrency(quote.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Customer Portal Link */}
          {quote.public_token && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-primary" />
                Customer Portal
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Share this link with your customer to view and accept the quote.
              </p>
              <div className="bg-muted/30 rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground break-all">
                /portal/{quote.public_token?.substring(0, 12)}...
              </div>
              <div className="flex gap-2 mt-3">
                <a
                  href={`/portal/${quote.public_token}`}
                  target="_blank"
                  className="btn-secondary flex-1 justify-center text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
