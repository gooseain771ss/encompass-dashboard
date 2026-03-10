'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateQuoteStatus, deleteQuote } from '@/app/actions/quotes'
import { getNextStatus, getQuoteStatusLabel } from '@/lib/utils'
import type { Quote, QuoteStatus } from '@/types/database'
import { ChevronRight, Trash2, ArrowRight } from 'lucide-react'

export function QuoteActions({ quote }: { quote: Quote }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const nextStatus = getNextStatus(quote.status)

  async function handleAdvance() {
    if (!nextStatus) return
    setError('')
    startTransition(async () => {
      const result = await updateQuoteStatus(quote.id, nextStatus)
      if (result.error) setError(result.error)
    })
  }

  async function handleDelete() {
    if (!confirm('Delete this quote? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteQuote(quote.id)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/dashboard/trips')
      }
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {nextStatus && (
        <button
          onClick={handleAdvance}
          disabled={isPending}
          className="btn-primary"
        >
          <ArrowRight className="w-4 h-4" />
          Mark as {getQuoteStatusLabel(nextStatus)}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="btn-destructive"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  )
}
