'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ALL_CATEGORIES, getCategoryDef } from '@/components/personal/categories'
import Link from 'next/link'
import {
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Pencil,
  Check,
  X,
} from 'lucide-react'

interface PersonalTransaction {
  id: string
  transaction_date: string
  description: string
  merchant: string | null
  category: string
  subcategory: string | null
  amount: number
  confidence_score: number | null
  source: string | null
  notes: string | null
  is_income: boolean
  needs_review: boolean
}

interface EditState {
  description: string
  merchant: string
  category: string
  subcategory: string
  amount: string
  transaction_date: string
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'text-emerald-400 bg-emerald-900/30 border-emerald-800/40'
    : pct >= 60 ? 'text-amber-400 bg-amber-900/30 border-amber-800/40'
    : 'text-red-400 bg-red-900/30 border-red-800/40'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${color}`}>
      {pct}% confidence
    </span>
  )
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null
  const label = source.replace(/_/g, ' ')
  return (
    <span className="text-xs px-1.5 py-0.5 rounded border border-blue-800/40 text-blue-300 bg-blue-900/20">
      {label}
    </span>
  )
}

function TransactionCard({
  tx,
  onApprove,
  onEditAndApprove,
}: {
  tx: PersonalTransaction
  onApprove: (id: string) => void
  onEditAndApprove: (id: string, data: Partial<PersonalTransaction>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [edit, setEdit] = useState<EditState>({
    description: tx.description,
    merchant: tx.merchant || '',
    category: tx.category,
    subcategory: tx.subcategory || '',
    amount: String(Math.abs(tx.amount)),
    transaction_date: tx.transaction_date,
  })

  const subcategories = getCategoryDef(edit.category)?.subcategories || []

  function handleCategoryChange(cat: string) {
    setEdit(e => ({ ...e, category: cat, subcategory: '' }))
  }

  async function handleSaveAndApprove() {
    setSaving(true)
    await onEditAndApprove(tx.id, {
      description: edit.description,
      merchant: edit.merchant || null,
      category: edit.category,
      subcategory: edit.subcategory || null,
      amount: tx.is_income ? Math.abs(parseFloat(edit.amount)) : -Math.abs(parseFloat(edit.amount)),
      transaction_date: edit.transaction_date,
    })
    setSaving(false)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              className="input-base w-full text-sm font-medium"
              value={edit.description}
              onChange={e => setEdit(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
            />
          ) : (
            <p className="text-sm font-medium text-foreground leading-tight truncate">{tx.description}</p>
          )}
          {!editing && tx.merchant && tx.merchant !== tx.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{tx.merchant}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidenceBadge score={tx.confidence_score} />
          <SourceBadge source={tx.source} />
        </div>
      </div>

      {/* Edit fields */}
      {editing && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="form-label mb-1 block text-xs">Merchant</label>
            <input
              className="input-base w-full text-sm"
              value={edit.merchant}
              onChange={e => setEdit(prev => ({ ...prev, merchant: e.target.value }))}
              placeholder="Merchant"
            />
          </div>
          <div>
            <label className="form-label mb-1 block text-xs">Date</label>
            <input
              type="date"
              className="input-base w-full text-sm"
              value={edit.transaction_date}
              onChange={e => setEdit(prev => ({ ...prev, transaction_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label mb-1 block text-xs">Category</label>
            <select
              className="input-base w-full text-sm"
              value={edit.category}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              {ALL_CATEGORIES.map(c => (
                <option key={c.label} value={c.label}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label mb-1 block text-xs">Subcategory</label>
            <select
              className="input-base w-full text-sm"
              value={edit.subcategory}
              onChange={e => setEdit(prev => ({ ...prev, subcategory: e.target.value }))}
              disabled={subcategories.length === 0}
            >
              <option value="">— none —</option>
              {subcategories.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label mb-1 block text-xs">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-base w-full text-sm"
              value={edit.amount}
              onChange={e => setEdit(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Info row (non-edit mode) */}
      {!editing && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">{formatDate(tx.transaction_date)}</span>
          <span className="text-muted-foreground">·</span>
          <span className="bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded">{tx.category}</span>
          {tx.subcategory && (
            <span className="text-muted-foreground">› {tx.subcategory}</span>
          )}
          {tx.notes && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground italic truncate max-w-xs">{tx.notes}</span>
            </>
          )}
        </div>
      )}

      {/* Amount + actions */}
      <div className="flex items-center justify-between gap-3">
        <span className={`text-base font-bold tabular-nums ${tx.is_income ? 'text-emerald-400' : 'text-red-400'}`}>
          {tx.is_income ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
        </span>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="btn-ghost flex items-center gap-1 text-xs"
                disabled={saving}
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSaveAndApprove}
                disabled={saving}
                className="btn-primary flex items-center gap-1 text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save & Approve'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary flex items-center gap-1 text-xs"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit & Approve
              </button>
              <button
                onClick={() => onApprove(tx.id)}
                className="btn-primary flex items-center gap-1 text-xs"
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PersonalReviewPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('personal_transactions')
      .select('*')
      .eq('needs_review', true)
      .order('transaction_date', { ascending: false })
      .limit(200)
    setTransactions((data as PersonalTransaction[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  async function handleApprove(id: string) {
    await supabase
      .from('personal_transactions')
      .update({ needs_review: false })
      .eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  async function handleEditAndApprove(id: string, data: Partial<PersonalTransaction>) {
    await supabase
      .from('personal_transactions')
      .update({ ...data, needs_review: false })
      .eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/personal/transactions"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transactions
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Personal Review Queue</h1>
          {!loading && (
            <span className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${
              transactions.length > 0
                ? 'bg-amber-900/30 text-amber-300 border border-amber-800/40'
                : 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/40'
            }`}>
              {transactions.length}
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Review and approve personal transactions that need attention.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">Loading…</div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <CheckCircle className="w-16 h-16 text-emerald-400" />
          <div className="text-center">
            <p className="text-xl font-semibold text-foreground">All caught up!</p>
            <p className="text-muted-foreground text-sm mt-1">No transactions need review right now.</p>
          </div>
          <Link href="/dashboard/personal/transactions" className="btn-secondary mt-2">
            View All Transactions
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map(tx => (
            <TransactionCard
              key={tx.id}
              tx={tx}
              onApprove={handleApprove}
              onEditAndApprove={handleEditAndApprove}
            />
          ))}
        </div>
      )}
    </div>
  )
}
