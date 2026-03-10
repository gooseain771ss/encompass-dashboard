export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PortalActions } from '@/components/portal/PortalActions'
import { Plane, MapPin, Calendar, Users, DollarSign, CheckCircle, Clock } from 'lucide-react'

export default async function CustomerPortalPage({ params }: { params: { quoteId: string } }) {
  const supabase = createClient()

  // Look up by public_token
  const { data: quote } = await supabase
    .from('quotes')
    .select('*, aircraft(name, make, model, max_pax, cruise_speed_ktas)')
    .eq('public_token', params.quoteId)
    .single()

  if (!quote) notFound()

  const isActive = !['declined', 'cancelled', 'paid'].includes(quote.status)
  const isAccepted = ['accepted', 'scheduled', 'completed', 'invoiced', 'paid'].includes(quote.status)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl">
            <Plane className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Encompass Aviation</p>
            <p className="text-xs text-muted-foreground">flyencompass.com</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Status Banner */}
        {isAccepted && (
          <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-5 py-4">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-400 font-semibold text-sm">Quote Accepted</p>
              <p className="text-muted-foreground text-xs">Your trip is confirmed. We look forward to flying with you.</p>
            </div>
          </div>
        )}

        {quote.status === 'declined' && (
          <div className="flex items-center gap-3 bg-red-950/30 border border-red-800/40 rounded-xl px-5 py-4">
            <Clock className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 font-semibold text-sm">Quote Declined</p>
          </div>
        )}

        {/* Quote Header */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-navy-950 to-navy-900 px-6 py-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-primary/80 font-medium uppercase tracking-widest mb-1">
                  Flight Quote
                </p>
                <h1 className="text-2xl font-bold text-foreground">{quote.quote_number}</h1>
                {quote.customer_name && (
                  <p className="text-muted-foreground text-sm mt-1">Prepared for {quote.customer_name}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{formatCurrency(quote.total_price)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total trip cost</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Route */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Departure</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{quote.origin_icao}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="w-8 h-px bg-border" />
                  <Plane className="w-4 h-4 text-muted-foreground" />
                  <div className="w-8 h-px bg-border" />
                </div>
                {quote.distance_nm && (
                  <p className="text-xs text-muted-foreground">{quote.distance_nm} nm</p>
                )}
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Arrival</p>
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{quote.destination_icao}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-muted/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Date</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{formatDate(quote.departure_date)}</p>
                {quote.departure_time && <p className="text-xs text-muted-foreground">{quote.departure_time}</p>}
              </div>

              <div className="bg-muted/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Passengers</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{quote.pax_count}</p>
              </div>

              <div className="bg-muted/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Aircraft</p>
                </div>
                <p className="text-sm font-semibold text-foreground">{(quote.aircraft as any)?.name || '—'}</p>
                <p className="text-xs text-muted-foreground">{(quote.aircraft as any)?.make} {(quote.aircraft as any)?.model}</p>
              </div>

              <div className="bg-muted/20 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Est. Flight</p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {quote.flight_time_hrs ? `${quote.flight_time_hrs}h` : '—'}
                </p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-muted/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Price Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                {quote.base_rate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Charter rate</span>
                    <span className="text-foreground">{formatCurrency(quote.base_rate)}</span>
                  </div>
                )}
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
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({quote.discount_pct}% off)</span>
                    <span>-{formatCurrency(quote.discount_amount)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">{formatCurrency(quote.total_price)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="bg-muted/20 rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-2">Additional Notes</p>
                <p className="text-sm text-muted-foreground">{quote.notes}</p>
              </div>
            )}

            {/* Accept / Decline Buttons */}
            {isActive && !isAccepted && (
              <PortalActions quoteId={quote.id} quoteToken={quote.public_token!} />
            )}

            {/* Payment placeholder */}
            {isAccepted && quote.status !== 'paid' && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-foreground mb-1">Secure Payment Coming Soon</p>
                <p className="text-xs text-muted-foreground">
                  Online payment will be available soon. Please contact us to arrange payment.
                </p>
                <a href="tel:+15555555555" className="btn-primary inline-flex mt-3 mx-auto">
                  Contact Us to Pay
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Encompass Aviation · flyencompass.com</p>
          <p>Questions? Call us or reply to your booking email.</p>
        </div>
      </div>
    </div>
  )
}
