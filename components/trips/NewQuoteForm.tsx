'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createQuote } from '@/app/actions/quotes'
import { haversineNm, calculateFlightTime, AIRPORT_COORDS } from '@/lib/aviation/calculator'
import { formatCurrency, formatCurrencyExact } from '@/lib/utils'
import type { Aircraft, Pilot } from '@/types/database'
import { Calculator, Plane, User, MapPin, Calendar, DollarSign, AlertTriangle, ArrowRight, Info } from 'lucide-react'

interface Props {
  aircraft: Aircraft[]
  pilots: Pilot[]
  airports: { icao: string; name: string; city: string | null; state: string | null; latitude: number | null; longitude: number | null }[]
}

export function NewQuoteForm({ aircraft, pilots, airports }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Form state
  const [form, setForm] = useState({
    originIcao: '',
    destinationIcao: '',
    departureDate: '',
    departureTime: '',
    returnDate: '',
    returnTime: '',
    paxCount: 1,
    aircraftId: aircraft[0]?.id || '',
    isRoundTrip: false,
    isEmptyLeg: false,
    emptyLegDiscountPct: 50,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    fuelSurcharge: 0,
    airportFees: 0,
    cateringCost: 0,
    groundTransport: 0,
    otherFees: 0,
    pilotId: '',
    pilotDays: 1,
    notes: '',
    internalNotes: '',
  })

  // Calculated values
  const [calc, setCalc] = useState({
    distanceNm: 0,
    flightTimeHrs: 0,
    baseRate: 0,
    pilotCost: 0,
    discountAmount: 0,
    total: 0,
  })

  const selectedAircraft = aircraft.find(a => a.id === form.aircraftId)
  const selectedPilot = pilots.find(p => p.id === form.pilotId)

  // Build airport lookup from db + static coords
  const airportLookup = new Map<string, { lat: number; lon: number }>()
  airports.forEach(a => {
    if (a.latitude && a.longitude) {
      airportLookup.set(a.icao, { lat: a.latitude, lon: a.longitude })
    }
  })
  // Also use static coords as fallback
  Object.entries(AIRPORT_COORDS).forEach(([icao, coords]) => {
    if (!airportLookup.has(icao)) {
      airportLookup.set(icao, coords)
    }
  })

  // Recalculate whenever inputs change
  useEffect(() => {
    if (!form.originIcao || !form.destinationIcao || !selectedAircraft) {
      setCalc({ distanceNm: 0, flightTimeHrs: 0, baseRate: 0, pilotCost: 0, discountAmount: 0, total: 0 })
      return
    }

    const originCoords = airportLookup.get(form.originIcao.toUpperCase())
    const destCoords = airportLookup.get(form.destinationIcao.toUpperCase())

    if (!originCoords || !destCoords) {
      setCalc({ distanceNm: 0, flightTimeHrs: 0, baseRate: 0, pilotCost: 0, discountAmount: 0, total: 0 })
      return
    }

    const distNm = haversineNm(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon)
    const flightHrs = calculateFlightTime(distNm, selectedAircraft.cruise_speed_ktas) * (form.isRoundTrip ? 2 : 1)
    const baseRate = flightHrs * selectedAircraft.hourly_rate

    const pilotCost = selectedPilot?.daily_rate
      ? selectedPilot.daily_rate * form.pilotDays
      : 0

    const subtotal = baseRate + form.fuelSurcharge + form.airportFees + pilotCost +
      form.cateringCost + form.groundTransport + form.otherFees

    const discountAmount = form.isEmptyLeg ? subtotal * (form.emptyLegDiscountPct / 100) : 0

    setCalc({
      distanceNm: Math.round(distNm),
      flightTimeHrs: Math.round(flightHrs * 10) / 10,
      baseRate: Math.round(baseRate),
      pilotCost: Math.round(pilotCost),
      discountAmount: Math.round(discountAmount),
      total: Math.round(subtotal - discountAmount),
    })
  }, [
    form.originIcao, form.destinationIcao, form.aircraftId, form.isRoundTrip,
    form.isEmptyLeg, form.emptyLegDiscountPct, form.fuelSurcharge, form.airportFees,
    form.cateringCost, form.groundTransport, form.otherFees, form.pilotId, form.pilotDays,
    selectedAircraft, selectedPilot
  ])

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent, action: 'draft' | 'send') {
    e.preventDefault()
    setError('')

    if (!form.originIcao || !form.destinationIcao || !form.departureDate || !form.aircraftId) {
      setError('Please fill in all required fields')
      return
    }

    startTransition(async () => {
      const result = await createQuote({
        ...form,
        ...calc,
        action,
      })
      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/dashboard/trips/${result.id}`)
      }
    })
  }

  const maxPax = selectedAircraft?.max_pax || 8

  return (
    <form className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Route & Aircraft */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Route & Aircraft
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label mb-1.5 block">Origin (ICAO) *</label>
            <input
              list="airports-list"
              value={form.originIcao}
              onChange={e => update('originIcao', e.target.value.toUpperCase())}
              placeholder="KCCO"
              className="input-base uppercase"
              maxLength={4}
            />
          </div>
          <div className="flex items-end justify-center pb-0.5">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <label className="form-label mb-1.5 block">Destination (ICAO) *</label>
            <input
              list="airports-list"
              value={form.destinationIcao}
              onChange={e => update('destinationIcao', e.target.value.toUpperCase())}
              placeholder="KTEB"
              className="input-base uppercase"
              maxLength={4}
            />
          </div>
        </div>

        <datalist id="airports-list">
          {airports.map(a => (
            <option key={a.icao} value={a.icao}>{a.name} ({a.city}, {a.state})</option>
          ))}
        </datalist>

        {calc.distanceNm > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">{calc.distanceNm} nm</span> great-circle distance ·{' '}
              <span className="font-semibold">{calc.flightTimeHrs}h</span> estimated flight time
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label mb-1.5 block">Aircraft *</label>
            <select
              value={form.aircraftId}
              onChange={e => update('aircraftId', e.target.value)}
              className="input-base"
            >
              {aircraft.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.registration}) — ${a.hourly_rate.toLocaleString()}/hr
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label mb-1.5 block">Passengers</label>
            <input
              type="number"
              min={1}
              max={maxPax}
              value={form.paxCount}
              onChange={e => update('paxCount', parseInt(e.target.value) || 1)}
              className="input-base"
            />
            {selectedAircraft && (
              <p className="text-xs text-muted-foreground mt-1">Max {maxPax} pax for {selectedAircraft.name}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isRoundTrip}
              onChange={e => update('isRoundTrip', e.target.checked)}
              className="rounded border-border bg-input"
            />
            <span className="text-sm text-foreground">Round Trip</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isEmptyLeg}
              onChange={e => update('isEmptyLeg', e.target.checked)}
              className="rounded border-border bg-input"
            />
            <span className="text-sm text-foreground">Empty Leg / Ferry</span>
          </label>
        </div>

        {form.isEmptyLeg && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Empty Leg Discount %</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.emptyLegDiscountPct}
                onChange={e => update('emptyLegDiscountPct', parseInt(e.target.value) || 50)}
                className="input-base"
              />
            </div>
            <div className="flex items-end pb-0.5">
              <p className="text-sm text-amber-400 font-medium">
                Saving {formatCurrency(calc.discountAmount)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Schedule
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="form-label mb-1.5 block">Departure Date *</label>
            <input
              type="date"
              value={form.departureDate}
              onChange={e => update('departureDate', e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="form-label mb-1.5 block">Departure Time</label>
            <input
              type="time"
              value={form.departureTime}
              onChange={e => update('departureTime', e.target.value)}
              className="input-base"
            />
          </div>
          {form.isRoundTrip && (
            <>
              <div>
                <label className="form-label mb-1.5 block">Return Date</label>
                <input
                  type="date"
                  value={form.returnDate}
                  onChange={e => update('returnDate', e.target.value)}
                  className="input-base"
                />
              </div>
              <div>
                <label className="form-label mb-1.5 block">Return Time</label>
                <input
                  type="time"
                  value={form.returnTime}
                  onChange={e => update('returnTime', e.target.value)}
                  className="input-base"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Customer
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label mb-1.5 block">Name</label>
            <input
              value={form.customerName}
              onChange={e => update('customerName', e.target.value)}
              placeholder="John Smith"
              className="input-base"
            />
          </div>
          <div>
            <label className="form-label mb-1.5 block">Email</label>
            <input
              type="email"
              value={form.customerEmail}
              onChange={e => update('customerEmail', e.target.value)}
              placeholder="john@example.com"
              className="input-base"
            />
          </div>
          <div>
            <label className="form-label mb-1.5 block">Phone</label>
            <input
              type="tel"
              value={form.customerPhone}
              onChange={e => update('customerPhone', e.target.value)}
              placeholder="(555) 000-0000"
              className="input-base"
            />
          </div>
        </div>
      </div>

      {/* Pilot */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Plane className="w-4 h-4 text-primary" />
          Crew
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label mb-1.5 block">PIC Pilot</label>
            <select
              value={form.pilotId}
              onChange={e => update('pilotId', e.target.value)}
              className="input-base"
            >
              <option value="">— Select pilot —</option>
              {pilots.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} {p.daily_rate ? `— $${p.daily_rate}/day` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label mb-1.5 block">Pilot Days</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={form.pilotDays}
              onChange={e => update('pilotDays', parseFloat(e.target.value) || 1)}
              className="input-base"
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Additional Fees
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label mb-1.5 block">Fuel Surcharge</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min={0}
                value={form.fuelSurcharge}
                onChange={e => update('fuelSurcharge', parseFloat(e.target.value) || 0)}
                className="input-base pl-6"
              />
            </div>
          </div>
          <div>
            <label className="form-label mb-1.5 block">Airport Fees</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min={0}
                value={form.airportFees}
                onChange={e => update('airportFees', parseFloat(e.target.value) || 0)}
                className="input-base pl-6"
              />
            </div>
          </div>
          <div>
            <label className="form-label mb-1.5 block">Catering</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min={0}
                value={form.cateringCost}
                onChange={e => update('cateringCost', parseFloat(e.target.value) || 0)}
                className="input-base pl-6"
              />
            </div>
          </div>
          <div>
            <label className="form-label mb-1.5 block">Ground Transport</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min={0}
                value={form.groundTransport}
                onChange={e => update('groundTransport', parseFloat(e.target.value) || 0)}
                className="input-base pl-6"
              />
            </div>
          </div>
          <div>
            <label className="form-label mb-1.5 block">Other Fees</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min={0}
                value={form.otherFees}
                onChange={e => update('otherFees', parseFloat(e.target.value) || 0)}
                className="input-base pl-6"
              />
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2 border border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Price Breakdown
          </h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Base rate ({calc.flightTimeHrs}h × {formatCurrency(selectedAircraft?.hourly_rate || 0)}/hr)
              </span>
              <span className="text-foreground font-medium">{formatCurrency(calc.baseRate)}</span>
            </div>
            {form.fuelSurcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fuel surcharge</span>
                <span className="text-foreground">{formatCurrency(form.fuelSurcharge)}</span>
              </div>
            )}
            {form.airportFees > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Airport fees</span>
                <span className="text-foreground">{formatCurrency(form.airportFees)}</span>
              </div>
            )}
            {calc.pilotCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pilot cost</span>
                <span className="text-foreground">{formatCurrency(calc.pilotCost)}</span>
              </div>
            )}
            {form.cateringCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Catering</span>
                <span className="text-foreground">{formatCurrency(form.cateringCost)}</span>
              </div>
            )}
            {form.groundTransport > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ground transport</span>
                <span className="text-foreground">{formatCurrency(form.groundTransport)}</span>
              </div>
            )}
            {form.otherFees > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Other fees</span>
                <span className="text-foreground">{formatCurrency(form.otherFees)}</span>
              </div>
            )}
            {calc.discountAmount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Empty leg discount ({form.emptyLegDiscountPct}%)</span>
                <span>-{formatCurrency(calc.discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
              <span className="text-foreground">Total</span>
              <span className="text-primary text-lg">{formatCurrency(calc.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-foreground">Notes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label mb-1.5 block">Customer-Facing Notes</label>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              rows={3}
              placeholder="Notes visible to the customer..."
              className="input-base resize-none"
            />
          </div>
          <div>
            <label className="form-label mb-1.5 block">Internal Notes</label>
            <textarea
              value={form.internalNotes}
              onChange={e => update('internalNotes', e.target.value)}
              rows={3}
              placeholder="Internal notes (not shown to customer)..."
              className="input-base resize-none"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={e => handleSubmit(e as any, 'draft')}
          className="btn-ghost"
          disabled={isPending}
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={e => handleSubmit(e as any, 'send')}
          className="btn-primary"
          disabled={isPending || calc.total === 0}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            'Create & Send Quote'
          )}
        </button>
      </div>
    </form>
  )
}
