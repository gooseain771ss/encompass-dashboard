'use client'

import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Leg {
  leg: number
  route: string
  hobbs_start: number
  hobbs_end: number
  flight_time: number
  dep_time?: string | null
  arr_time?: string | null
  dep_airport?: string | null
  arr_airport?: string | null
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
  eng1_end: number | null
  eng2_end: number | null
  cyc1_start: number | null
  cyc2_start: number | null
  cyc1_end: number | null
  cyc2_end: number | null
  landings_start: number | null
  landings_end: number | null
  fuel_end_lbs: number | null
  fuel_end_left_lbs: number | null
  fuel_end_right_lbs: number | null
  status: string | null
  notes: string | null
  origin_icao?: string | null
  destination_icao?: string | null
  created_at: string
}

function fmt(n: number | null | undefined, decimals = 1) {
  if (n == null) return '—'
  return n.toFixed(decimals)
}

function fmtInt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toString()
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function Cell({ label, value, wide }: { label: string; value: string | React.ReactNode; wide?: boolean }) {
  return (
    <div className={`border border-gray-300 p-2 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export function ManifestPrint({ manifest: m }: { manifest: Manifest }) {
  const legs: Leg[] = Array.isArray(m.legs) ? m.legs : []

  // Calculate deltas if we have start + end
  const eng1Trip = m.eng1_start != null && m.eng1_end != null ? (m.eng1_end - m.eng1_start) : null
  const eng2Trip = m.eng2_start != null && m.eng2_end != null ? (m.eng2_end - m.eng2_start) : null
  const cyc1Trip = m.cyc1_start != null && m.cyc1_end != null ? (m.cyc1_end - m.cyc1_start) : null
  const cyc2Trip = m.cyc2_start != null && m.cyc2_end != null ? (m.cyc2_end - m.cyc2_start) : null
  const landingsTrip = m.landings_start != null && m.landings_end != null ? (m.landings_end - m.landings_start) : null

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .manifest-page { box-shadow: none !important; margin: 0 !important; }
        }
        @page { margin: 0.5in; size: letter; }
      `}</style>

      {/* Controls bar */}
      <div className="no-print sticky top-0 z-50 bg-card border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/manifests" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-semibold text-foreground">
            Flight #{m.flight_number} — Manifest
          </span>
          {m.status && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              m.status === 'complete'
                ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/30'
                : 'bg-amber-900/30 text-amber-400 border-amber-800/30'
            }`}>{m.status}</span>
          )}
        </div>
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 no-print">
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Manifest document */}
      <div className="bg-gray-200 min-h-screen py-8 px-4 print:bg-white print:p-0">
        <div className="manifest-page bg-white max-w-[816px] mx-auto shadow-xl print:shadow-none print:max-w-none">

          {/* ── Header ── */}
          <div className="flex items-start justify-between px-8 pt-8 pb-4 border-b-2 border-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/encompass-logo.png" alt="Encompass Aviation" className="h-12 object-contain" />
            <div className="text-right">
              <p className="text-2xl font-extrabold tracking-widest text-gray-900 uppercase">Flight Manifest</p>
              <p className="text-sm text-gray-500 mt-0.5">{fmtDate(m.flight_date)}</p>
            </div>
          </div>

          <div className="px-8 py-5 space-y-5">

            {/* ── Trip info ── */}
            <div className="grid grid-cols-4 gap-0 border border-gray-300 divide-x divide-gray-300">
              <Cell label="Flight #" value={m.flight_number} />
              <Cell label="Aircraft" value={m.aircraft_reg} />
              <Cell label="PIC" value={m.pic || '—'} />
              <Cell label="SIC" value={m.sic || '—'} />
            </div>

            {m.customer && (
              <div className="grid grid-cols-1 border border-gray-300">
                <Cell label="Customer / Passenger(s)" value={m.customer} />
              </div>
            )}

            {/* ── Legs table ── */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Flight Legs</p>
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr style={{ backgroundColor: '#3D4A4A' }}>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wide border border-gray-500 w-10">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wide border border-gray-500">Route</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-white uppercase tracking-wide border border-gray-500 w-28">Dep Time</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-white uppercase tracking-wide border border-gray-500 w-28">Arr Time</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide border border-gray-500 w-28">Hobbs Start</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide border border-gray-500 w-28">Hobbs End</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide border border-gray-500 w-24">Block Time</th>
                  </tr>
                </thead>
                <tbody>
                  {legs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-400 italic text-sm border border-gray-300">
                        No legs recorded
                      </td>
                    </tr>
                  ) : (
                    legs.map((l, i) => (
                      <tr key={l.leg} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2.5 text-gray-600 border border-gray-300 text-center">{l.leg}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900 border border-gray-300">{l.route}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 border border-gray-300">{l.dep_time || '—'}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600 border border-gray-300">{l.arr_time || '—'}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700 border border-gray-300">{fmt(l.hobbs_start)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700 border border-gray-300">{fmt(l.hobbs_end)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900 border border-gray-300">{fmt(l.flight_time)}</td>
                      </tr>
                    ))
                  )}
                  {/* Totals row */}
                  <tr className="bg-gray-100 border-t-2 border-gray-400">
                    <td colSpan={6} className="px-3 py-2.5 text-right font-bold text-gray-700 border border-gray-300 text-xs uppercase tracking-wide">
                      Total Block Time
                    </td>
                    <td className="px-3 py-2.5 text-right font-extrabold text-gray-900 border border-gray-300">
                      {fmt(m.total_flight_time)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Hobbs / Aircraft Times ── */}
            <div className="grid grid-cols-2 gap-4">

              {/* Hobbs */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Hobbs Meter</p>
                <div className="border border-gray-300 divide-y divide-gray-200">
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-2.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Meter In</p>
                      <p className="text-lg font-bold text-gray-900">{fmt(m.hobbs_start)}</p>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Meter Out</p>
                      <p className="text-lg font-bold text-gray-900">{fmt(m.hobbs_end)}</p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">This Flight</p>
                    <p className="text-lg font-bold text-gray-900">{fmt(m.total_flight_time)} hrs</p>
                  </div>
                </div>
              </div>

              {/* Landings */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Landings</p>
                <div className="border border-gray-300 divide-y divide-gray-200">
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-2.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Start</p>
                      <p className="text-lg font-bold text-gray-900">{fmtInt(m.landings_start)}</p>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">End</p>
                      <p className="text-lg font-bold text-gray-900">{fmtInt(m.landings_end)}</p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">This Flight</p>
                    <p className="text-lg font-bold text-gray-900">{landingsTrip != null ? landingsTrip : '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Engine Times ── */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Engine Times &amp; Cycles</p>
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr style={{ backgroundColor: '#3D4A4A' }}>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wide border border-gray-500"></th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide border border-gray-500">Start</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide border border-gray-500">End</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wide border border-gray-500">This Trip</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Engine #1 Hours', start: m.eng1_start, end: m.eng1_end, trip: eng1Trip, decimals: 1 },
                    { label: 'Engine #2 Hours', start: m.eng2_start, end: m.eng2_end, trip: eng2Trip, decimals: 1 },
                    { label: 'Engine #1 Cycles', start: m.cyc1_start, end: m.cyc1_end, trip: cyc1Trip, decimals: 0 },
                    { label: 'Engine #2 Cycles', start: m.cyc2_start, end: m.cyc2_end, trip: cyc2Trip, decimals: 0 },
                  ].map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 border border-gray-300">{row.label}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600 border border-gray-300">{fmt(row.start, row.decimals)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600 border border-gray-300">{fmt(row.end, row.decimals)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900 border border-gray-300">
                        {row.trip != null ? row.trip.toFixed(row.decimals) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Fuel ── */}
            {(m.fuel_end_lbs != null || m.fuel_end_left_lbs != null) && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fuel On Board (Block-In)</p>
                <div className="border border-gray-300 grid grid-cols-3 divide-x divide-gray-200">
                  <div className="p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-lg font-bold text-gray-900">{m.fuel_end_lbs != null ? `${m.fuel_end_lbs} lbs` : '—'}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Left Tank</p>
                    <p className="text-lg font-bold text-gray-900">{m.fuel_end_left_lbs != null ? `${m.fuel_end_left_lbs} lbs` : '—'}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Right Tank</p>
                    <p className="text-lg font-bold text-gray-900">{m.fuel_end_right_lbs != null ? `${m.fuel_end_right_lbs} lbs` : '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Notes ── */}
            {m.notes && (
              <div className="border border-gray-300 p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notes</p>
                <p className="text-sm text-gray-700">{m.notes}</p>
              </div>
            )}

          </div>

          {/* ── Footer ── */}
          <div className="border-t-2 border-gray-800 mx-8 pb-6 pt-3 mt-4">
            <p className="text-[10px] text-gray-400 text-center tracking-wide">
              Encompass Aviation Inc · 121 Green Park Way, Newnan, GA 30263-6288 · scott@flyencompass.com · flyencompass.com
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
