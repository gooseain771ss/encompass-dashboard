'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Aircraft } from '@/types/database'
import { Plus, X, DollarSign } from 'lucide-react'

const categories = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'crew', label: 'Crew' },
  { value: 'landing_fees', label: 'Landing Fees' },
  { value: 'catering', label: 'Catering' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'hangar', label: 'Hangar' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'ground_transport', label: 'Ground Transport' },
  { value: 'other', label: 'Other' },
]

export function AddTransactionForm({ aircraft }: { aircraft: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'fuel',
    amount: '',
    is_income: false,
    aircraft_id: '',
    payment_method: '',
    reference_number: '',
    notes: '',
  })

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.amount || !form.transaction_date) {
      setError('Date, description, and amount are required')
      return
    }
    setError('')

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('transactions').insert({
        transaction_date: form.transaction_date,
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        is_income: form.is_income,
        aircraft_id: form.aircraft_id || null,
        payment_method: form.payment_method || null,
        reference_number: form.reference_number || null,
        notes: form.notes || null,
        created_by: user?.id,
      })
      if (error) {
        setError(error.message)
      } else {
        setOpen(false)
        setForm({ transaction_date: new Date().toISOString().split('T')[0], description: '', category: 'fuel', amount: '', is_income: false, aircraft_id: '', payment_method: '', reference_number: '', notes: '' })
        router.refresh()
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" />
        Add Transaction
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Add Transaction
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}

              {/* Income / Expense toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border">
                <button
                  type="button"
                  onClick={() => update('is_income', false)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${!form.is_income ? 'bg-red-900/50 text-red-300' : 'text-muted-foreground hover:bg-muted/30'}`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => update('is_income', true)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${form.is_income ? 'bg-emerald-900/50 text-emerald-300' : 'text-muted-foreground hover:bg-muted/30'}`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="form-label mb-1.5 block">Date</label>
                <input type="date" value={form.transaction_date} onChange={e => update('transaction_date', e.target.value)} className="input-base" />
              </div>

              <div>
                <label className="form-label mb-1.5 block">Description *</label>
                <input value={form.description} onChange={e => update('description', e.target.value)} placeholder="e.g. Fuel uplift KCCO" className="input-base" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input type="number" min={0} step="0.01" value={form.amount} onChange={e => update('amount', e.target.value)} placeholder="0.00" className="input-base pl-6" />
                  </div>
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Category</label>
                  <select value={form.category} onChange={e => update('category', e.target.value)} className="input-base">
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label mb-1.5 block">Aircraft (optional)</label>
                <select value={form.aircraft_id} onChange={e => update('aircraft_id', e.target.value)} className="input-base">
                  <option value="">— None —</option>
                  {aircraft.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label mb-1.5 block">Payment Method</label>
                  <input value={form.payment_method} onChange={e => update('payment_method', e.target.value)} placeholder="Card, Check, ACH" className="input-base" />
                </div>
                <div>
                  <label className="form-label mb-1.5 block">Reference #</label>
                  <input value={form.reference_number} onChange={e => update('reference_number', e.target.value)} placeholder="Check #" className="input-base" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
                  {isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
