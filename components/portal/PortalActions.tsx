'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle } from 'lucide-react'

interface Props {
  quoteId: string
  quoteToken: string
}

export function PortalActions({ quoteId, quoteToken }: Props) {
  const [status, setStatus] = useState<'idle' | 'accepted' | 'declined'>('idle')
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  async function handleAccept() {
    startTransition(async () => {
      await supabase
        .from('quotes')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', quoteId)
        .eq('public_token', quoteToken)
      setStatus('accepted')
    })
  }

  async function handleDecline() {
    if (!confirm('Are you sure you want to decline this quote?')) return
    startTransition(async () => {
      await supabase
        .from('quotes')
        .update({ status: 'declined' })
        .eq('id', quoteId)
        .eq('public_token', quoteToken)
      setStatus('declined')
    })
  }

  if (status === 'accepted') {
    return (
      <div className="flex items-center justify-center gap-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-5">
        <CheckCircle className="w-6 h-6 text-emerald-400" />
        <div>
          <p className="text-emerald-400 font-semibold">Quote Accepted!</p>
          <p className="text-muted-foreground text-sm">We'll be in touch shortly to confirm your trip details.</p>
        </div>
      </div>
    )
  }

  if (status === 'declined') {
    return (
      <div className="flex items-center justify-center gap-3 bg-muted/20 rounded-xl p-5">
        <p className="text-muted-foreground text-sm">Quote declined. Thank you for considering Encompass Aviation.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={handleAccept}
        disabled={isPending}
        className="btn-primary flex-1 justify-center py-3 text-base"
      >
        <CheckCircle className="w-5 h-5" />
        Accept Quote
      </button>
      <button
        onClick={handleDecline}
        disabled={isPending}
        className="btn-destructive flex-1 justify-center py-3 text-base"
      >
        <XCircle className="w-5 h-5" />
        Decline
      </button>
    </div>
  )
}
