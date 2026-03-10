'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Settings, X } from 'lucide-react'
import { EXPENSE_CATEGORIES } from './categories'

interface Props {
  year: number
  month: number
  existingBudgets: Array<{ category: string; subcategory: string | null; budgeted_amount: number }>
}

export function BudgetSetForm({ year, month, existingBudgets }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [amounts, setAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    existingBudgets.forEach(b => {
      const key = b.subcategory ? `${b.category}|||${b.subcategory}` : b.category
      map[key] = b.budgeted_amount.toFixed(2)
    })
    return map
  })
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    const rows = Object.entries(amounts)
      .filter(([, v]) => parseFloat(v) > 0)
      .map(([key, val]) => {
        const [cat, sub] = key.split('|||')
        return {
          period: 'monthly' as const,
          year,
          month,
          category: cat,
          subcategory: sub || null,
          budgeted_amount: parseFloat(val),
        }
      })

    // Upsert all
    const { error } = await supabase
      .from('personal_budgets')
      .upsert(rows, { onConflict: 'period,year,month,category,subcategory' })

    setSaving(false)
    if (!error) {
      setOpen(false)
      router.refresh()
    } else {
      alert('Error saving budget: ' + error.message)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <Settings className="w-4 h-4" />
        Set Budgets
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-foreground">
                Set Monthly Budgets — {new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              {EXPENSE_CATEGORIES.filter(c => c.label !== 'Uncategorized').map(cat => (
                <div key={cat.label}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-foreground w-40 shrink-0">{cat.label}</span>
                    {cat.subcategories.length === 0 && (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={amounts[cat.label] || ''}
                        onChange={e => setAmounts(prev => ({ ...prev, [cat.label]: e.target.value }))}
                        className="input-base w-32"
                      />
                    )}
                  </div>
                  {cat.subcategories.length > 0 && (
                    <div className="ml-4 space-y-1.5">
                      {cat.subcategories.map(sub => {
                        const key = `${cat.label}|||${sub}`
                        return (
                          <div key={sub} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-36 shrink-0">{sub}</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0"
                              value={amounts[key] || ''}
                              onChange={e => setAmounts(prev => ({ ...prev, [key]: e.target.value }))}
                              className="input-base w-32"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 flex gap-3">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : 'Save Budgets'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
