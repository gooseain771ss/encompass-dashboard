'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, X, Users } from 'lucide-react'

export function AddPilotForm({ aircraft }: { aircraft: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'staff' as const,
    atp_rated: false,
    daily_rate: '',
    total_hours: '',
    pic_hours: '',
    medical_class: '',
    medical_expiry: '',
    notes: '',
  })

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name) {
      setError('First and last name are required')
      return
    }
    setError('')

    startTransition(async () => {
      const { error } = await supabase.from('pilots').insert({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
        status: form.status,
        atp_rated: form.atp_rated,
        daily_rate: form.daily_rate ? parseFloat(form.daily_rate) : null,
        total_hours: form.total_hours ? parseFloat(form.total_hours) : 0,
        pic_hours: form.pic_hours ? parseFloat(form.pic_hours) : 0,
        medical_class: form.medical_class || null,
        medical_expiry: form.medical_expiry || null,
        notes: form.notes || null,
      })
      if (error) {
        setError(error.message)
      } else {
        setOpen(false)
        setForm({ first_name: '', last_name: '', email: '', phone: '', status: 'staff', atp_rated: false, daily_rate: '', total_hours: '', pic_hours: '', medical_class: '', medical_expiry: '', notes: '' })
        router.refresh()
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" />
        Add Pilot
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Add Pilot
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">First Name *</label>
                  <input value={form.first_name} onChange={e => update('first_name', e.target.value)} className="input-base" />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Last Name *</label>
                  <input value={form.last_name} onChange={e => update('last_name', e.target.value)} className="input-base" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Email</label>
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-base" />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input-base" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Status</label>
                  <select value={form.status} onChange={e => update('status', e.target.value)} className="input-base">
                    <option value="staff">Staff</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Daily Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input type="number" value={form.daily_rate} onChange={e => update('daily_rate', e.target.value)} placeholder="600" className="input-base pl-6" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Total Hours</label>
                  <input type="number" value={form.total_hours} onChange={e => update('total_hours', e.target.value)} className="input-base" />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">PIC Hours</label>
                  <input type="number" value={form.pic_hours} onChange={e => update('pic_hours', e.target.value)} className="input-base" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Medical Class</label>
                  <select value={form.medical_class} onChange={e => update('medical_class', e.target.value)} className="input-base">
                    <option value="">— None —</option>
                    <option value="First">First Class</option>
                    <option value="Second">Second Class</option>
                    <option value="Third">Third Class</option>
                    <option value="BasicMed">BasicMed</option>
                  </select>
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Medical Expiry</label>
                  <input type="date" value={form.medical_expiry} onChange={e => update('medical_expiry', e.target.value)} className="input-base" />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.atp_rated} onChange={e => update('atp_rated', e.target.checked)} className="rounded border-border" />
                <span className="text-sm text-foreground">ATP Rated</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
                  {isPending ? 'Saving...' : 'Add Pilot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
