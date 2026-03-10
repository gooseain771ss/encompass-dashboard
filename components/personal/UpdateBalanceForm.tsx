'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Pencil } from 'lucide-react'

interface Props {
  accountId: string
  currentBalance: number
}

export function UpdateBalanceForm({ accountId, currentBalance }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentBalance.toFixed(2))
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('personal_accounts')
      .update({ balance: parseFloat(value) || 0 })
      .eq('id', accountId)
    setSaving(false)
    if (!error) {
      setEditing(false)
      router.refresh()
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
          step="0.01"
          className="input-base w-32 text-right"
          autoFocus
        />
        <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-2 py-1">
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-2 py-1">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Update balance"
    >
      <Pencil className="w-3 h-3" />
    </button>
  )
}
