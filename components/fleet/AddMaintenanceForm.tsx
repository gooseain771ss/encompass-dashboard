'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Aircraft } from '@/types/database'
import { Plus, X, Wrench } from 'lucide-react'

export function AddMaintenanceForm({ aircraft }: { aircraft: Aircraft[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    aircraft_id: aircraft[0]?.id || '',
    title: '',
    description: '',
    maintenance_type: 'other' as const,
    due_date: '',
    due_hours: '',
    estimated_cost: '',
    vendor: '',
    is_recurring: false,
    interval_days: '',
  })

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.aircraft_id) {
      setError('Title and aircraft are required')
      return
    }
    setError('')
    startTransition(async () => {
      const { error } = await supabase.from('maintenance_items').insert({
        aircraft_id: form.aircraft_id,
        title: form.title,
        description: form.description || null,
        maintenance_type: form.maintenance_type,
        status: 'upcoming',
        due_date: form.due_date || null,
        due_hours: form.due_hours ? parseFloat(form.due_hours) : null,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
        vendor: form.vendor || null,
        is_recurring: form.is_recurring,
        interval_days: form.interval_days ? parseInt(form.interval_days) : null,
      })
      if (error) {
        setError(error.message)
      } else {
        setOpen(false)
        setForm({ aircraft_id: aircraft[0]?.id || '', title: '', description: '', maintenance_type: 'other', due_date: '', due_hours: '', estimated_cost: '', vendor: '', is_recurring: false, interval_days: '' })
        router.refresh()
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs py-1.5">
        <Plus className="w-3.5 h-3.5" />
        Add Item
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Add Maintenance Item
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div>
                <label className="form-label mb-1.5 block">Aircraft</label>
                <select value={form.aircraft_id} onChange={e => update('aircraft_id', e.target.value)} className="input-base">
                  {aircraft.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label mb-1.5 block">Title *</label>
                <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. 100-hour inspection" className="input-base" />
              </div>

              <div>
                <label className="form-label mb-1.5 block">Type</label>
                <select value={form.maintenance_type} onChange={e => update('maintenance_type', e.target.value)} className="input-base">
                  <option value="100hr">100-Hour</option>
                  <option value="200hr">200-Hour</option>
                  <option value="annual">Annual</option>
                  <option value="hot_section">Hot Section</option>
                  <option value="overhaul">Overhaul</option>
                  <option value="ad">Airworthiness Directive</option>
                  <option value="service_bulletin">Service Bulletin</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} className="input-base" />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Due at Hours</label>
                  <input type="number" value={form.due_hours} onChange={e => update('due_hours', e.target.value)} placeholder="2500" className="input-base" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Est. Cost</label>
                  <input type="number" value={form.estimated_cost} onChange={e => update('estimated_cost', e.target.value)} placeholder="0" className="input-base" />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Vendor</label>
                  <input value={form.vendor} onChange={e => update('vendor', e.target.value)} placeholder="ABC Aviation" className="input-base" />
                </div>
              </div>

              <div>
                <label className="form-label mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={2} className="input-base resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
                  {isPending ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
