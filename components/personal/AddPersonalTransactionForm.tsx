'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, getCategoryDef } from './categories'

interface Account {
  id: string
  name: string
  institution: string | null
}

interface Props {
  accounts: Account[]
}

export function AddPersonalTransactionForm({ accounts }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isIncome, setIsIncome] = useState(false)
  const [category, setCategory] = useState('Uncategorized')
  const [subcategory, setSubcategory] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const categoryOptions = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const subcategories = getCategoryDef(category)?.subcategories || []

  function handleCategoryChange(cat: string) {
    setCategory(cat)
    setSubcategory('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = e.currentTarget
    const data = new FormData(form)

    const amountRaw = parseFloat(data.get('amount') as string) || 0
    const amount = isIncome ? Math.abs(amountRaw) : -Math.abs(amountRaw)

    const { error } = await supabase.from('personal_transactions').insert({
      account_id: data.get('account_id') || null,
      transaction_date: data.get('transaction_date') as string,
      description: data.get('description') as string,
      merchant: data.get('merchant') as string || null,
      amount,
      is_income: isIncome,
      category,
      subcategory: subcategory || null,
      source: 'manual',
      notes: data.get('notes') as string || null,
    })

    setSaving(false)
    if (!error) {
      setOpen(false)
      form.reset()
      router.refresh()
    } else {
      alert('Error saving transaction: ' + error.message)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" />
        Add Transaction
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add Transaction</h2>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Income / Expense toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => { setIsIncome(false); setCategory('Uncategorized') }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${!isIncome ? 'bg-red-500/20 text-red-400 border-r border-border' : 'text-muted-foreground hover:bg-muted/30 border-r border-border'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setIsIncome(true); setCategory('Miscellaneous') }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${isIncome ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground hover:bg-muted/30'}`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Date *</label>
              <input
                type="date"
                name="transaction_date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
                className="input-base"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Amount *</label>
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
                className="input-base"
              />
            </div>
          </div>

          <div>
            <label className="form-label mb-1.5 block">Description *</label>
            <input type="text" name="description" required placeholder="What was this for?" className="input-base" />
          </div>

          <div>
            <label className="form-label mb-1.5 block">Merchant</label>
            <input type="text" name="merchant" placeholder="Store or payee name" className="input-base" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Category *</label>
              <select value={category} onChange={e => handleCategoryChange(e.target.value)} className="input-base">
                {categoryOptions.map(c => (
                  <option key={c.label} value={c.label}>{c.label}</option>
                ))}
              </select>
            </div>
            {subcategories.length > 0 && (
              <div>
                <label className="form-label mb-1.5 block">Subcategory</label>
                <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="input-base">
                  <option value="">None</option>
                  {subcategories.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="form-label mb-1.5 block">Account</label>
            <select name="account_id" className="input-base">
              <option value="">No account</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.institution ? ` — ${a.institution}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label mb-1.5 block">Notes</label>
            <input type="text" name="notes" placeholder="Optional notes" className="input-base" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
