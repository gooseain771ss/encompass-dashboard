'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Aircraft } from '@/types/database'
import { Plus, X, AlertTriangle } from 'lucide-react'

export function AddSquawkForm({ aircraft }: { aircraft: Aircraft[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    aircraft_id: aircraft[0]?.id || '',
    title: '',
    description: '',
    is_mel: false,
    grounding: false,
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
      const { error } = await supabase.from('squawks').insert({
        aircraft_id: form.aircraft_id,
        title: form.title,
        description: form.description || null,
        status: 'open',
        is_mel: form.is_mel,
        grounding: form.grounding,
      })
      if (error) {
        setError(error.message)
      } else {
        setOpen(false)
        setForm({ aircraft_id: aircraft[0]?.id || '', title: '', description: '', is_mel: false, grounding: false })
        router.refresh()
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs py-1.5">
        <Plus className="w-3.5 h-3.5" />
        Log Squawk
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Log Squawk
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
                <label className="form-label mb-1.5 block">Squawk *</label>
                <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Left nav light inop" className="input-base" />
              </div>

              <div>
                <label className="form-label mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Details..." className="input-base resize-none" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_mel} onChange={e => update('is_mel', e.target.checked)} className="rounded border-border" />
                  <span className="text-sm text-foreground">MEL item</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.grounding} onChange={e => update('grounding', e.target.checked)} className="rounded border-border" />
                  <span className="text-sm text-red-400 font-medium">Grounding squawk</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
                  {isPending ? 'Saving...' : 'Log Squawk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
