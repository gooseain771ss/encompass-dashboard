'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateQuoteParams {
  originIcao: string
  destinationIcao: string
  departureDate: string
  departureTime: string
  returnDate: string
  returnTime: string
  paxCount: number
  aircraftId: string
  isRoundTrip: boolean
  isEmptyLeg: boolean
  emptyLegDiscountPct: number
  customerName: string
  customerEmail: string
  customerPhone: string
  fuelSurcharge: number
  airportFees: number
  cateringCost: number
  groundTransport: number
  otherFees: number
  pilotId: string
  pilotDays: number
  notes: string
  internalNotes: string
  distanceNm: number
  flightTimeHrs: number
  baseRate: number
  pilotCost: number
  discountAmount: number
  total: number
  action: 'draft' | 'send'
}

export async function createQuote(params: CreateQuoteParams): Promise<{ id?: string; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const status = params.action === 'send' ? 'sent' : 'draft'

  // Create or find customer
  let customerId: string | null = null
  if (params.customerEmail) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('email', params.customerEmail)
      .single()

    if (existing) {
      customerId = existing.id
    } else if (params.customerName) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          name: params.customerName,
          email: params.customerEmail,
          phone: params.customerPhone,
        })
        .select('id')
        .single()
      if (newCustomer) customerId = newCustomer.id
    }
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      status,
      customer_id: customerId,
      customer_name: params.customerName || null,
      customer_email: params.customerEmail || null,
      customer_phone: params.customerPhone || null,
      aircraft_id: params.aircraftId || null,
      origin_icao: params.originIcao.toUpperCase(),
      destination_icao: params.destinationIcao.toUpperCase(),
      departure_date: params.departureDate,
      departure_time: params.departureTime || null,
      return_date: params.returnDate || null,
      return_time: params.returnTime || null,
      pax_count: params.paxCount,
      is_round_trip: params.isRoundTrip,
      is_empty_leg: params.isEmptyLeg,
      distance_nm: params.distanceNm || null,
      flight_time_hrs: params.flightTimeHrs || null,
      base_rate: params.baseRate || null,
      fuel_surcharge: params.fuelSurcharge,
      airport_fees: params.airportFees,
      pilot_cost: params.pilotCost,
      catering_cost: params.cateringCost,
      ground_transport: params.groundTransport,
      other_fees: params.otherFees,
      discount_pct: params.isEmptyLeg ? params.emptyLegDiscountPct : 0,
      discount_amount: params.discountAmount,
      total_price: params.total || null,
      notes: params.notes || null,
      internal_notes: params.internalNotes || null,
      sent_at: params.action === 'send' ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Create pilot assignment if pilot selected
  if (params.pilotId && quote) {
    await supabase.from('pilot_assignments').insert({
      quote_id: quote.id,
      pilot_id: params.pilotId,
      role: 'pic',
      days_estimated: params.pilotDays,
      total_cost: params.pilotCost,
    })
  }

  revalidatePath('/dashboard/trips')
  return { id: quote.id }
}

export async function updateQuoteStatus(
  quoteId: string,
  status: string
): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, any> = { status }
  if (status === 'sent') updates.sent_at = new Date().toISOString()
  if (status === 'accepted') updates.accepted_at = new Date().toISOString()

  const { error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', quoteId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/trips')
  revalidatePath(`/dashboard/trips/${quoteId}`)
  return {}
}

export async function deleteQuote(quoteId: string): Promise<{ error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('quotes').delete().eq('id', quoteId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/trips')
  return {}
}
