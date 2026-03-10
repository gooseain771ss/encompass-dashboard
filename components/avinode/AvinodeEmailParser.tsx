'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { parseAvinodeEmail, scoreTripRequest, generatePricingRecommendation } from '@/lib/aviation/avinode-parser'
import { formatCurrency, getFitScoreColor } from '@/lib/utils'
import type { Aircraft } from '@/types/database'
import { Mail, X, Zap, CheckCircle, ArrowRight, DollarSign, Target } from 'lucide-react'

export function AvinodeEmailParser({ aircraft }: { aircraft: Aircraft[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'paste' | 'review' | 'saved'>('paste')
  const [emailText, setEmailText] = useState('')
  const [parsed, setParsed] = useState<any>(null)
  const [score, setScore] = useState<any>(null)
  const [pricing, setPricing] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [bidAmount, setBidAmount] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function handleParse() {
    if (!emailText.trim()) {
      setError('Please paste the Avinode email text')
      return
    }
    setError('')

    const parsedData = parseAvinodeEmail(emailText)
    setParsed(parsedData)

    // Get existing trip dates for availability check
    const tripScore = scoreTripRequest(parsedData, aircraft, [])
    setScore(tripScore)

    const pricingRec = generatePricingRecommendation(parsedData, aircraft, tripScore, [])
    setPricing(pricingRec)
    setBidAmount(pricingRec.suggested_bid.toString())

    setStep('review')
  }

  async function handleSave(status: 'pending' | 'bid_submitted' | 'passed') {
    setError('')
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('broker_requests').insert({
        broker_name: 'Avinode',
        raw_email_text: emailText,
        origin_icao: parsed?.origin_icao,
        destination_icao: parsed?.destination_icao,
        departure_date: parsed?.departure_date,
        return_date: parsed?.return_date,
        pax_count: parsed?.pax_count,
        requested_aircraft_type: parsed?.requested_aircraft_type,
        client_budget: parsed?.client_budget,
        client_name: parsed?.client_name,
        notes_from_broker: parsed?.notes_from_broker,
        fit_score: score?.total,
        score_breakdown: score?.breakdown,
        suggested_bid: pricing?.suggested_bid,
        min_acceptable_bid: pricing?.min_acceptable_bid,
        pricing_notes: pricing?.notes,
        status,
        bid_amount: status === 'bid_submitted' ? (parseFloat(bidAmount) || null) : null,
        bid_submitted_at: status === 'bid_submitted' ? new Date().toISOString() : null,
        created_by: user?.id,
      })
      if (error) {
        setError(error.message)
      } else {
        setStep('saved')
        setTimeout(() => {
          setOpen(false)
          setStep('paste')
          setEmailText('')
          setParsed(null)
          setScore(null)
          setPricing(null)
          router.refresh()
        }, 2000)
      }
    })
  }

  function handleClose() {
    setOpen(false)
    setStep('paste')
    setEmailText('')
    setParsed(null)
    setScore(null)
    setPricing(null)
    setError('')
  }

  const scoreColor = getFitScoreColor(score?.total)

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Zap className="w-4 h-4" />
        Parse Avinode Email
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Avinode Email Intelligence
              </h2>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {step === 'paste' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Paste the Avinode trip request email below. The AI will extract route, dates, passenger count, budget, and score the trip for you.
                  </p>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <div>
                    <label className="form-label mb-1.5 block">Email Text</label>
                    <textarea
                      value={emailText}
                      onChange={e => setEmailText(e.target.value)}
                      rows={12}
                      placeholder="Paste Avinode trip request email here...

Example:
Trip Request from Avinode
From: KCCO To: KTEB
Date: March 15, 2024
Passengers: 3 pax
Aircraft: Light Jet / VLJ
Budget: $8,500 all-in
Client: John Smith
Notes: Wheels up by 9am"
                      className="input-base resize-none font-mono text-sm"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button onClick={handleClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleParse} className="btn-primary">
                      <Zap className="w-4 h-4" />
                      Analyze Email
                    </button>
                  </div>
                </div>
              )}

              {step === 'review' && parsed && score && pricing && (
                <div className="space-y-6">
                  {/* Fit Score Banner */}
                  <div className={`rounded-xl p-5 border ${score.total >= 7 ? 'bg-emerald-950/30 border-emerald-800/40' : score.total >= 5 ? 'bg-amber-950/30 border-amber-800/40' : 'bg-red-950/30 border-red-800/40'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Trip Fit Analysis
                      </h3>
                      <div className="text-right">
                        <span className={`text-3xl font-bold ${scoreColor}`}>{score.total}</span>
                        <span className="text-muted-foreground">/10</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {Object.entries(score.breakdown).map(([key, val]) => (
                        <div key={key} className="bg-black/20 rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className={`text-sm font-bold ${getFitScoreColor(val as number)}`}>{String(val)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {score.notes.map((note: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">{String(note)}</p>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Parsed Fields */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground text-sm">Parsed Trip Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Route</span>
                          <span className="text-foreground font-medium">
                            {parsed.origin_icao && parsed.destination_icao
                              ? `${parsed.origin_icao} → ${parsed.destination_icao}`
                              : '— Not detected —'
                            }
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Date</span>
                          <span className="text-foreground">{parsed.departure_date || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Passengers</span>
                          <span className="text-foreground">{parsed.pax_count ?? '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Aircraft Req.</span>
                          <span className="text-foreground">{parsed.requested_aircraft_type || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Client Budget</span>
                          <span className="text-foreground">{parsed.client_budget ? formatCurrency(parsed.client_budget) : '—'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">Client</span>
                          <span className="text-foreground">{parsed.client_name || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Recommendation */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        Pricing Recommendation
                      </h3>
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Suggested Bid</p>
                          <p className="text-2xl font-bold text-primary">{formatCurrency(pricing.suggested_bid)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Minimum</p>
                            <p className="font-medium text-foreground">{formatCurrency(pricing.min_acceptable_bid)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Maximum</p>
                            <p className="font-medium text-foreground">{formatCurrency(pricing.max_bid)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{pricing.notes}</p>
                      </div>

                      <div>
                        <label className="form-label mb-1.5 block">Your Bid Amount</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={e => setBidAmount(e.target.value)}
                            className="input-base pl-6"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 justify-between pt-2 border-t border-border">
                    <button onClick={() => setStep('paste')} className="btn-ghost">
                      ← Re-paste
                    </button>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSave('passed')}
                        disabled={isPending}
                        className="btn-secondary"
                      >
                        Pass on Trip
                      </button>
                      <button
                        onClick={() => handleSave('pending')}
                        disabled={isPending}
                        className="btn-secondary"
                      >
                        Save for Later
                      </button>
                      <button
                        onClick={() => handleSave('bid_submitted')}
                        disabled={isPending}
                        className="btn-primary"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Submit Bid
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 'saved' && (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Request Saved!</h3>
                  <p className="text-muted-foreground text-sm">Redirecting back to Avinode Intelligence...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
