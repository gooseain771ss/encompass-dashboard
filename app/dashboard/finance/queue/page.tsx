'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  CheckCircle, Edit2, X, Loader2, AlertTriangle,
  ArrowLeft, Clock, Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type QueueItem = {
  id: string
  transaction_date: string
  description: string
  category: string
  amount: number
  is_income: boolean
  payment_method: string | null
  receipt_url: string | null
  receipt_storage_path: string | null
  needs_review: boolean
  confidence_score: number | null
  source: string | null
  raw_extracted_text: string | null
  aircraft_id: string | null
  notes: string | null
  created_at: string
  // from view joins
  receipt_id: string | null
  receipt_filename: string | null
  receipt_vendor: string | null
  receipt_amount: number | null
  receipt_date: string | null
  receipt_parsed_data: Record<string, unknown> | null
  aircraft_name: string | null
  aircraft_registration: string | null
}

type EditState = {
  description: string
  amount: string
  category: string
  transaction_date: string
}

const CATEGORIES = [
  'fuel', 'maintenance', 'crew', 'landing_fees',
  'catering', 'insurance', 'hangar', 'navigation',
  'ground_transport', 'other',
]

const CATEGORY_LABELS: Record<string, string> = {
  fuel: 'Fuel', maintenance: 'Maintenance', crew: 'Crew', landing_fees: 'Landing Fees',
  catering: 'Catering', insurance: 'Insurance', hangar: 'Hangar', navigation: 'Navigation',
  ground_transport: 'Ground Transport', other: 'Other',
}

// ─── Confidence Badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const pct = Math.round(score * 100)
  const color =
    pct >= 80 ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40' :
    pct >= 60 ? 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40' :
                'bg-red-900/40 text-red-400 border-red-700/40'
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      <AlertTriangle className="w-3 h-3" />
      {pct}% confidence
    </span>
  )
}

// ─── Queue Item Card ──────────────────────────────────────────────────────────

function QueueCard({
  item,
  onApprove,
  onApproveWithEdits,
}: {
  item: QueueItem
  onApprove: (id: string) => Promise<void>
  onApproveWithEdits: (id: string, edits: EditState) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editState, setEditState] = useState<EditState>({
    description: item.description,
    amount: String(Math.abs(item.amount)),
    category: item.category,
    transaction_date: item.transaction_date,
  })

  const vendor = item.receipt_vendor || item.description
  const displayAmount = Math.abs(item.amount)

  async function handleApprove() {
    setLoading(true)
    if (editing) {
      await onApproveWithEdits(item.id, editState)
    } else {
      await onApprove(item.id)
    }
    setLoading(false)
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex gap-0 flex-col sm:flex-row">
        {/* Thumbnail */}
        <div className="sm:w-36 sm:min-h-full bg-muted/20 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-border shrink-0">
          {item.receipt_url ? (
            <a href={item.receipt_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.receipt_url}
                alt="Receipt"
                className="w-full sm:w-36 h-28 sm:h-full object-cover hover:opacity-80 transition-opacity"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none'
                  e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center w-full h-full p-4"><svg class="w-8 h-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>'
                }}
              />
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 gap-2 opacity-30">
              <ImageIcon className="w-8 h-8" />
              <span className="text-xs">No image</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <ConfidenceBadge score={item.confidence_score} />
              {item.source && (
                <span className="text-xs bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full capitalize border border-border">
                  via {item.source}
                </span>
              )}
              {item.aircraft_name && (
                <span className="text-xs bg-muted/40 text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                  {item.aircraft_registration}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>

          {editing ? (
            /* ── Edit Mode ── */
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label block mb-1 text-xs">Vendor / Description</label>
                <input
                  className="input-base w-full text-sm"
                  value={editState.description}
                  onChange={e => setEditState(s => ({ ...s, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label block mb-1 text-xs">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-base w-full text-sm"
                  value={editState.amount}
                  onChange={e => setEditState(s => ({ ...s, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label block mb-1 text-xs">Category</label>
                <select
                  className="input-base w-full text-sm"
                  value={editState.category}
                  onChange={e => setEditState(s => ({ ...s, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label block mb-1 text-xs">Date</label>
                <input
                  type="date"
                  className="input-base w-full text-sm"
                  value={editState.transaction_date}
                  onChange={e => setEditState(s => ({ ...s, transaction_date: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            /* ── View Mode ── */
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <p className="text-xs text-muted-foreground">Vendor</p>
                <p className="text-sm font-medium text-foreground">{vendor}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-semibold text-red-400">-{formatCurrency(displayAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm text-foreground">{formatDate(item.transaction_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded capitalize border border-border">
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
              </div>
            </div>
          )}

          {/* Raw extracted text (collapsed) */}
          {item.raw_extracted_text && !editing && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground transition-colors">Raw extracted data</summary>
              <pre className="mt-1 p-2 bg-muted/20 rounded text-xs overflow-auto max-h-24 border border-border">
                {item.raw_extracted_text}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />
              }
              {editing ? 'Save & Approve' : 'Approve'}
            </button>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <Edit2 className="w-4 h-4" />
                Edit &amp; Approve
              </button>
            ) : (
              <button
                onClick={() => setEditing(false)}
                className="btn-ghost flex items-center gap-1.5 text-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceiptQueuePage() {
  const supabase = createClient()
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function loadQueue() {
    setLoading(true)
    const { data, error } = await supabase
      .from('receipt_queue')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setItems((data as QueueItem[]) || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleApprove(id: string) {
    const { error } = await supabase
      .from('transactions')
      .update({ needs_review: false })
      .eq('id', id)

    if (error) {
      alert('Failed to approve: ' + error.message)
      return
    }
    startTransition(() => {
      setItems(prev => prev.filter(i => i.id !== id))
    })
  }

  async function handleApproveWithEdits(id: string, edits: EditState) {
    const amount = parseFloat(edits.amount) || 0
    const { error } = await supabase
      .from('transactions')
      .update({
        description: edits.description,
        amount: -Math.abs(amount), // expenses are negative
        category: edits.category,
        transaction_date: edits.transaction_date,
        needs_review: false,
      })
      .eq('id', id)

    if (error) {
      alert('Failed to save: ' + error.message)
      return
    }
    startTransition(() => {
      setItems(prev => prev.filter(i => i.id !== id))
    })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/finance" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Receipt Review Queue</h1>
            {items.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Receipts ingested via WhatsApp or email that need a quick review before entering your books.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading queue…
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 text-red-400 text-sm">
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
          <p className="text-foreground font-medium">All clear!</p>
          <p className="text-sm text-muted-foreground mt-1">
            No receipts waiting for review. Send a photo to the agent to add one.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {items.map(item => (
          <QueueCard
            key={item.id}
            item={item}
            onApprove={handleApprove}
            onApproveWithEdits={handleApproveWithEdits}
          />
        ))}
      </div>
    </div>
  )
}
