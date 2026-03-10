'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Aircraft, Pilot } from '@/types/database'
import { Plus, X, Activity } from 'lucide-react'

export function LogFlightForm({ aircraft, pilots }: { aircraft: Aircraft; pilots: Pilot[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    log_date: new Date().toISOString().split('T')[0],
    origin_icao: '',
    destination_icao: '',
    hobbs_start: '',
    hobbs_end: '',
    cycles: 1,
    pic_pilot_id: '',
    sic_pilot_id: '',
    notes: '',
  })

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const hobbsDiff = form.hobbs_start && form.hobbs_end
    ? parseFloat(form.hobbs_end) - parseFloat(form.hobbs_start)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.log_date) {
      setError('Date is required')
      return
    }
    setError('')

    const flightHrs = hobbsDiff && hobbsDiff > 0 ? hobbsDiff : null

    startTransition(async () => {
      const { error } = await supabase.from('flight_logs').insert({
        aircraft_id: aircraft.id,
        log_date: form.log_date,
        origin_icao: form.origin_icao.toUpperCase() || null,
        destination_icao: form.destination_icao.toUpperCase() || null,
        hobbs_start: form.hobbs_start ? parseFloat(form.hobbs_start) : null,
        hobbs_end: form.hobbs_end ? parseFloat(form.hobbs_end) : null,
        flight_time_hrs: flightHrs,
        cycles: form.cycles,
        airframe_hours_added: flightHrs,
        engine1_hours_added: flightHrs,
        engine2_hours_added: aircraft.aircraft_type === 'phenom_100' && flightHrs ? flightHrs : null,
        pic_pilot_id: form.pic_pilot_id || null,
        sic_pilot_id: form.sic_pilot_id || null,
        notes: form.notes || null,
      })
      if (error) {
        setError(error.message)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Activity className="w-4 h-4" />
        Log Flight
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Log Flight — {aircraft.name}
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div>
                <label className="form-label mb-1.5 block">Date</label>
                <input type="date" value={form.log_date} onChange={e => update('log_date', e.target.value)} className="input-base" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Origin (ICAO)</label>
                  <input value={form.origin_icao} onChange={e => update('origin_icao', e.target.value.toUpperCase())} placeholder="KCCO" className="input-base uppercase" maxLength={4} />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Destination</label>
                  <input value={form.destination_icao} onChange={e => update('destination_icao', e.target.value.toUpperCase())} placeholder="KTEB" className="input-base uppercase" maxLength={4} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Hobbs Start</label>
                  <input type="number" step="0.1" value={form.hobbs_start} onChange={e => update('hobbs_start', e.target.value)} placeholder={aircraft.airframe_hours.toString()} className="input-base" />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Hobbs End</label>
                  <input type="number" step="0.1" value={form.hobbs_end} onChange={e => update('hobbs_end', e.target.value)} className="input-base" />
                </div>
              </div>

              {hobbsDiff !== null && hobbsDiff > 0 && (
                <p className="text-sm text-primary font-medium">
                  Flight time: {hobbsDiff.toFixed(1)} hours
                </p>
              )}

              <div>
                <label className="form-label mb-1.5 block">Landings (Cycles)</label>
                <input type="number" min={1} value={form.cycles} onChange={e => update('cycles', parseInt(e.target.value) || 1)} className="input-base" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">PIC</label>
                  <select value={form.pic_pilot_id} onChange={e => update('pic_pilot_id', e.target.value)} className="input-base">
                    <option value="">— Select —</option>
                    {pilots.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label mb-1.5 block">SIC</label>
                  <select value={form.sic_pilot_id} onChange={e => update('sic_pilot_id', e.target.value)} className="input-base">
                    <option value="">— Select —</option>
                    {pilots.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label mb-1.5 block">Notes</label>
                <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2} className="input-base resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
                  {isPending ? 'Saving...' : 'Log Flight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
