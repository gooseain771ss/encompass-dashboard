'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'loan', label: 'Loan' },
  { value: 'property', label: 'Property' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
]

const LIABILITY_TYPES = new Set(['credit_card', 'mortgage', 'loan'])

interface Props {
  existingAccount?: {
    id: string
    name: string
    institution: string | null
    account_type: string
    last_four: string | null
    balance: number
    is_asset: boolean
    is_liability: boolean
    owner: string
    display_order: number
    notes: string | null
  }
  onClose?: () => void
}

export function AddAccountForm({ existingAccount, onClose }: Props) {
  const [open, setOpen] = useState(!!existingAccount)
  const [saving, setSaving] = useState(false)
  const [accountType, setAccountType] = useState(existingAccount?.account_type || 'checking')
  const router = useRouter()
  const supabase = createClient()

  const isLiability = LIABILITY_TYPES.has(accountType)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = e.currentTarget
    const data = new FormData(form)

    const payload = {
      name: data.get('name') as string,
      institution: data.get('institution') as string || null,
      account_type: accountType,
      last_four: data.get('last_four') as string || null,
      balance: parseFloat(data.get('balance') as string) || 0,
      is_asset: !isLiability,
      is_liability: isLiability,
      owner: data.get('owner') as string,
      display_order: parseInt(data.get('display_order') as string) || 0,
      notes: data.get('notes') as string || null,
    }

    let error
    if (existingAccount) {
      ;({ error } = await supabase.from('personal_accounts').update(payload).eq('id', existingAccount.id))
    } else {
      ;({ error } = await supabase.from('personal_accounts').insert(payload))
    }

    setSaving(false)
    if (!error) {
      setOpen(false)
      onClose?.()
      router.refresh()
    } else {
      alert('Error saving account: ' + error.message)
    }
  }

  function handleClose() {
    setOpen(false)
    onClose?.()
  }

  if (!open && !existingAccount) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" />
        Add Account
      </button>
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {existingAccount ? 'Edit Account' : 'Add Account'}
          </h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label mb-1.5 block">Account Name *</label>
              <input
                type="text"
                name="name"
                defaultValue={existingAccount?.name}
                required
                placeholder="e.g. Chase Checking"
                className="input-base"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Institution</label>
              <input
                type="text"
                name="institution"
                defaultValue={existingAccount?.institution || ''}
                placeholder="Chase, Wells Fargo…"
                className="input-base"
              />
            </div>
            <div>
              <label className="form-label mb-1.5 block">Last 4 Digits</label>
              <input
                type="text"
                name="last_four"
                defaultValue={existingAccount?.last_four || ''}
                maxLength={4}
                placeholder="1234"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label mb-1.5 block">Account Type *</label>
              <select
                value={accountType}
                onChange={e => setAccountType(e.target.value)}
                className="input-base"
              >
                {ACCOUNT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label mb-1.5 block">Owner *</label>
              <select name="owner" defaultValue={existingAccount?.owner || 'joint'} className="input-base">
                <option value="scott">Scott</option>
                <option value="wife">Wife</option>
                <option value="joint">Joint</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label mb-1.5 block">
              Current Balance{isLiability ? ' (amount owed)' : ''}
            </label>
            <input
              type="number"
              name="balance"
              defaultValue={existingAccount?.balance || 0}
              step="0.01"
              min="0"
              placeholder="0.00"
              className="input-base"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isLiability
                ? 'Enter the outstanding balance owed — will be counted as a liability.'
                : 'This account will be counted as an asset.'}
            </p>
          </div>

          <div>
            <label className="form-label mb-1.5 block">Display Order</label>
            <input
              type="number"
              name="display_order"
              defaultValue={existingAccount?.display_order || 0}
              className="input-base"
            />
          </div>

          <div>
            <label className="form-label mb-1.5 block">Notes</label>
            <input
              type="text"
              name="notes"
              defaultValue={existingAccount?.notes || ''}
              placeholder="Optional notes"
              className="input-base"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : existingAccount ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
