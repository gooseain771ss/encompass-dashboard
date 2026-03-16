'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plane, Clock, Fuel, User, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Leg {
  leg: number
  route: string
  hobbs_start: number
  hobbs_end: number
  flight_time: number
}

interface Manifest {
  id: string
  flight_number: string
  aircraft_reg: string
  flight_date: string
  pic: string | null
  sic: string | null
  customer: string | null
  hobbs_start: number | null
  hobbs_end: number | null
  total_flight_time: number | null
  legs: Leg[]
  eng1_start: number | null
  eng2_start: number | null
  cyc1_start: number | null
  cyc2_start: number | null
  landings_start: number | null
  fuel_end_lbs: number | null
  fuel_end_left_lbs: number | null
  fuel_end_right_lbs: number | null
  status: string | null
  notes: string | null
  created_at: string
}

function fmt(n: number | null | undefined, decimals = 1) {
  if (n == null) return '—'
  return n.toFixed(decimals)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function ManifestRow({ m }: { m: Manifest }) {
  const [open, setOpen] = useState(false)
  const legs: Leg[] = Array.isArray(m.legs) ? m.legs : []
  const route = legs.length > 0
    ? legs.map(l => l.route).join(' · ')
    : '—'

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
      >
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
          m.status === 'complete' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-amber-900/40 text-amber-400'
        )}>
          <Plane className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">Flight {m.flight_number}</span>
            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{m.aircraft_reg}</span>
            {m.status && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                m.status === 'complete'
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/30'
                  : 'bg-amber-900/30 text-amber-400 border border-amber-800/30'
              )}>
                {m.status}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{route}</div>
        </div>

        <div className="hidden sm:flex items-center gap-5 shrink-0 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {fmtDate(m.flight_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {fmt(m.total_flight_time)} hrs
          </span>
          {m.customer && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {m.customer}
            </span>
          )}
        </div>

        <div className="text-muted-foreground shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Detail panel */}
      {open && (
        <div className="border-t border-border/60 px-4 py-4 space-y-4 bg-muted/10">

          {/* Mobile summary */}
          <div className="sm:hidden flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(m.flight_date)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmt(m.total_flight_time)} hrs</span>
          </div>

          {/* Crew */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'PIC', value: m.pic || '—' },
              { label: 'SIC', value: m.sic || '—' },
              { label: 'Customer', value: m.customer || '—' },
              { label: 'Status', value: m.status || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {/* Legs */}
          {legs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Legs</p>
              <div className="space-y-1.5">
                {legs.map(l => (
                  <div key={l.leg} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                    <span className="font-medium text-foreground">{l.route}</span>
                    <span className="text-muted-foreground text-xs">
                      {l.hobbs_start} → {l.hobbs_end} &nbsp;·&nbsp; {l.flight_time} hrs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hobbs / Engine */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Hobbs Start', value: fmt(m.hobbs_start) },
              { label: 'Hobbs End', value: fmt(m.hobbs_end) },
              { label: 'Total Time', value: `${fmt(m.total_flight_time)} hrs` },
              { label: '', value: '' },
              { label: 'Eng #1 Start', value: fmt(m.eng1_start) },
              { label: 'Eng #2 Start', value: fmt(m.eng2_start) },
              { label: 'Cyc #1 Start', value: m.cyc1_start?.toString() ?? '—' },
              { label: 'Cyc #2 Start', value: m.cyc2_start?.toString() ?? '—' },
            ].filter(i => i.label).map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {/* Fuel */}
          {m.fuel_end_lbs != null && (
            <div className="flex items-center gap-2 text-sm bg-sky-900/20 border border-sky-800/30 rounded-lg px-3 py-2">
              <Fuel className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-sky-300 font-medium">Fuel on board (block-in):</span>
              <span className="text-foreground">
                {m.fuel_end_lbs} lbs
                {m.fuel_end_left_lbs != null && ` (${m.fuel_end_left_lbs}L / ${m.fuel_end_right_lbs}R)`}
              </span>
            </div>
          )}

          {/* Notes */}
          {m.notes && (
            <p className="text-xs text-muted-foreground italic border-t border-border/40 pt-3">
              {m.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function ManifestList({ manifests }: { manifests: Manifest[] }) {
  if (manifests.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <Plane className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No manifests yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Manifests are logged automatically when you send Hobbs meter photos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {manifests.map(m => (
        <ManifestRow key={m.id} m={m} />
      ))}
    </div>
  )
}
