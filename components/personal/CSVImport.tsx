'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Check, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { guessCategoryFromMerchant, EXPENSE_CATEGORIES, getCategoryDef } from './categories'

function isAmazonTransaction(description: string): boolean {
  const lower = description.toLowerCase()
  const isAmazon = lower.includes('amazon') || lower.includes('amzn')
  if (!isAmazon) return false
  // Keep Prime membership charges — they won't appear in order history CSVs
  const isPrime = lower.includes('prime')
  return !isPrime
}

interface Account {
  id: string
  name: string
  institution: string | null
}

interface ParsedRow {
  date: string
  description: string
  merchant: string
  amount: number
  isIncome: boolean
  category: string
  subcategory: string
  confidence: number
  selected: boolean
}

interface Props {
  accounts: Account[]
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let cell = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        cells.push(cell.trim())
        cell = ''
      } else {
        cell += ch
      }
    }
    cells.push(cell.trim())
    rows.push(cells)
  }
  return rows
}

function detectColumns(headers: string[]): { dateIdx: number; descIdx: number; amountIdx: number; creditIdx: number; debitIdx: number } {
  const h = headers.map(s => s.toLowerCase().replace(/[^a-z]/g, ''))
  const find = (...names: string[]) => names.reduce((found, n) => found !== -1 ? found : h.findIndex(s => s.includes(n)), -1)

  const dateIdx = find('date', 'postdate', 'transactiondate', 'posteddate')
  const descIdx = find('description', 'memo', 'payee', 'details', 'narrative', 'merchant', 'name', 'note')
  const amountIdx = find('amount', 'transactionamount', 'total', 'amt')
  const creditIdx = find('credit', 'deposit', 'inflow')
  const debitIdx = find('debit', 'withdrawal', 'charge', 'outflow')

  return { dateIdx, descIdx, amountIdx, creditIdx, debitIdx }
}

function parseDate(raw: string): string {
  // Try various formats: MM/DD/YYYY, YYYY-MM-DD, MM-DD-YYYY, etc.
  const clean = raw.trim()
  // already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
  // MM/DD/YYYY or M/D/YYYY
  const mdy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  // MM-DD-YYYY
  const mdyDash = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (mdyDash) return `${mdyDash[3]}-${mdyDash[1].padStart(2, '0')}-${mdyDash[2].padStart(2, '0')}`
  return clean
}

export function CSVImport({ accounts }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [skippedAmazonRows, setSkippedAmazonRows] = useState<ParsedRow[]>([])
  const [showSkipped, setShowSkipped] = useState(false)
  const [amazonBannerDismissed, setAmazonBannerDismissed] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState('')
  const [saving, setSaving] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const allRows = parseCSV(text)
      if (allRows.length < 2) { setError('CSV appears empty or unreadable.'); return }

      const headers = allRows[0]
      const { dateIdx, descIdx, amountIdx, creditIdx, debitIdx } = detectColumns(headers)

      if (dateIdx === -1 || descIdx === -1) {
        setError('Could not detect date/description columns. Ensure your CSV has headers like "Date", "Description", "Amount".')
        return
      }

      const parsed: ParsedRow[] = []
      const skipped: ParsedRow[] = []

      for (let i = 1; i < allRows.length; i++) {
        const row = allRows[i]
        if (row.length < 2) continue

        const rawDate = row[dateIdx] || ''
        const rawDesc = row[descIdx] || ''
        const date = parseDate(rawDate)
        if (!date || !rawDesc) continue

        let amount = 0
        let isIncome = false

        if (creditIdx !== -1 && debitIdx !== -1) {
          const credit = parseFloat((row[creditIdx] || '0').replace(/[$,()]/g, '')) || 0
          const debit = parseFloat((row[debitIdx] || '0').replace(/[$,()]/g, '')) || 0
          if (credit > 0) { amount = credit; isIncome = true }
          else if (debit > 0) { amount = -debit; isIncome = false }
        } else if (amountIdx !== -1) {
          const raw = (row[amountIdx] || '0').replace(/[$,]/g, '')
          amount = parseFloat(raw) || 0
          isIncome = amount > 0
          if (!isIncome) amount = -Math.abs(amount)
          else amount = Math.abs(amount)
        }

        const { category, subcategory, confidence } = guessCategoryFromMerchant(rawDesc)

        const parsedRow: ParsedRow = {
          date,
          description: rawDesc,
          merchant: rawDesc,
          amount: Math.abs(amount),
          isIncome,
          category,
          subcategory: subcategory || '',
          confidence,
          selected: true,
        }

        // Route non-Prime Amazon charges to the skipped bucket
        if (isAmazonTransaction(rawDesc)) {
          skipped.push({ ...parsedRow, selected: false })
        } else {
          parsed.push(parsedRow)
        }
      }

      if (parsed.length === 0 && skipped.length === 0) {
        setError('No valid transactions found in CSV.')
        return
      }

      setRows(parsed)
      setSkippedAmazonRows(skipped)
      setShowSkipped(false)
      setAmazonBannerDismissed(false)
      setStep('preview')
      setError('')
    }
    reader.readAsText(file)
  }

  function toggleRow(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r))
  }

  function updateRow(idx: number, field: keyof ParsedRow, value: string | boolean) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const updated = { ...r, [field]: value }
      if (field === 'category') updated.subcategory = ''
      return updated
    }))
  }

  /** Move a skipped Amazon row back into the main import list */
  function includeSkippedRow(skippedIdx: number) {
    const row = skippedAmazonRows[skippedIdx]
    setRows(prev => [...prev, { ...row, selected: true }])
    setSkippedAmazonRows(prev => prev.filter((_, i) => i !== skippedIdx))
  }

  async function handleImport() {
    setSaving(true)
    const selected = rows.filter(r => r.selected)
    const inserts = selected.map(r => ({
      account_id: selectedAccount || null,
      transaction_date: r.date,
      description: r.description,
      merchant: r.merchant,
      amount: r.isIncome ? r.amount : -r.amount,
      is_income: r.isIncome,
      category: r.category,
      subcategory: r.subcategory || null,
      source: 'csv_import' as const,
      needs_review: r.confidence < 0.5,
      confidence_score: r.confidence,
    }))

    const { error } = await supabase.from('personal_transactions').insert(inserts)
    setSaving(false)
    if (!error) {
      setImportedCount(selected.length)
      setStep('done')
      router.refresh()
    } else {
      setError('Import failed: ' + error.message)
    }
  }

  function reset() {
    setStep('upload')
    setRows([])
    setSkippedAmazonRows([])
    setShowSkipped(false)
    setAmazonBannerDismissed(false)
    setError('')
    setImportedCount(0)
    if (fileRef.current) fileRef.current.value = ''
    setOpen(false)
  }

  const selectedRows = rows.filter(r => r.selected)

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <Upload className="w-4 h-4" />
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-5xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-foreground">Import CSV Transactions</h2>
              <button onClick={reset} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Step 1: Upload */}
              {step === 'upload' && (
                <div className="p-8 flex flex-col items-center gap-6">
                  <div className="w-full max-w-md">
                    <label className="block w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">Drop CSV file or click to browse</p>
                      <p className="text-xs text-muted-foreground">Supports most bank export formats (Chase, Wells Fargo, Bank of America, Discover…)</p>
                      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
                    </label>
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3 w-full max-w-md">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground text-center max-w-sm">
                    <p className="font-medium mb-1">Expected columns (any order):</p>
                    <p>Date · Description/Merchant · Amount</p>
                    <p className="mt-1">— or —</p>
                    <p>Date · Description · Credit · Debit</p>
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
              {step === 'preview' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <p className="text-sm text-foreground font-medium">{rows.length} transactions detected</p>
                      <p className="text-xs text-muted-foreground">{selectedRows.length} selected for import. Review categories and adjust as needed.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="form-label text-xs mb-1 block">Apply to account</label>
                        <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="input-base text-xs">
                          <option value="">No account</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name}{a.institution ? ` — ${a.institution}` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 self-end">
                        <button onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: true })))} className="btn-ghost text-xs">All</button>
                        <button onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: false })))} className="btn-ghost text-xs">None</button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-2 mb-3">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Amazon skip banner */}
                  {skippedAmazonRows.length > 0 && !amazonBannerDismissed && (
                    <div className="mb-3 rounded-xl border border-blue-800/30 bg-blue-900/10">
                      <div className="flex items-start gap-2.5 px-4 py-3">
                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-300 flex-1">
                          <strong>{skippedAmazonRows.length}</strong> Amazon transaction{skippedAmazonRows.length !== 1 ? 's were' : ' was'} automatically skipped to avoid duplicating your Amazon order imports.
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setShowSkipped(v => !v)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            {showSkipped ? 'Hide' : 'Show skipped'}
                            {showSkipped ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => setAmazonBannerDismissed(true)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {showSkipped && (
                        <div className="border-t border-blue-800/20 px-4 py-3">
                          <p className="text-xs text-muted-foreground mb-2">
                            These rows matched "amazon" or "amzn" in the description. Use "Include anyway" if you haven&apos;t imported Amazon order history separately.
                          </p>
                          <div className="space-y-1.5">
                            {skippedAmazonRows.map((row, si) => (
                              <div key={si} className="flex items-center justify-between gap-3 text-xs bg-muted/10 rounded-lg px-3 py-2">
                                <span className="text-muted-foreground whitespace-nowrap">{row.date}</span>
                                <span className="text-foreground flex-1 truncate">{row.description}</span>
                                <span className="text-red-400 whitespace-nowrap font-medium">${row.amount.toFixed(2)}</span>
                                <button
                                  onClick={() => includeSkippedRow(si)}
                                  className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap border border-blue-800/40 rounded px-2 py-0.5"
                                >
                                  Include anyway
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-3 py-2 text-left w-8"></th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-left">Category</th>
                          <th className="px-3 py-2 text-left">Subcategory</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-center">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((row, idx) => {
                          const subcats = getCategoryDef(row.category)?.subcategories || []
                          return (
                            <tr key={idx} className={`transition-colors ${row.selected ? 'bg-card' : 'bg-muted/10 opacity-50'}`}>
                              <td className="px-3 py-1.5">
                                <input type="checkbox" checked={row.selected} onChange={() => toggleRow(idx)} className="rounded" />
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{row.date}</td>
                              <td className="px-3 py-1.5 max-w-xs">
                                <input
                                  type="text"
                                  value={row.description}
                                  onChange={e => updateRow(idx, 'description', e.target.value)}
                                  className="input-base text-xs py-0.5 px-2"
                                />
                              </td>
                              <td className="px-3 py-1.5">
                                <select
                                  value={row.category}
                                  onChange={e => updateRow(idx, 'category', e.target.value)}
                                  className="input-base text-xs py-0.5 px-2"
                                >
                                  {EXPENSE_CATEGORIES.map(c => (
                                    <option key={c.label} value={c.label}>{c.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-1.5">
                                {subcats.length > 0 ? (
                                  <select
                                    value={row.subcategory}
                                    onChange={e => updateRow(idx, 'subcategory', e.target.value)}
                                    className="input-base text-xs py-0.5 px-2"
                                  >
                                    <option value="">—</option>
                                    {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                ) : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className={`px-3 py-1.5 text-right font-semibold whitespace-nowrap ${row.isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                                {row.isIncome ? '+' : '-'}${row.amount.toFixed(2)}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <button
                                  onClick={() => updateRow(idx, 'isIncome', !row.isIncome)}
                                  className={`text-xs px-2 py-0.5 rounded ${row.isIncome ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}
                                >
                                  {row.isIncome ? 'Income' : 'Expense'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">
                              All transactions were Amazon charges and were skipped. Use "Include anyway" above if needed.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 3: Done */}
              {step === 'done' && (
                <div className="p-12 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-900/40 border border-emerald-600/30 flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Import Complete!</h3>
                  <p className="text-muted-foreground text-sm">
                    {importedCount} transaction{importedCount !== 1 ? 's' : ''} imported successfully.
                    {rows.filter(r => r.selected && r.confidence < 0.5).length > 0 && (
                      <span className="block mt-1 text-amber-400">
                        {rows.filter(r => r.selected && r.confidence < 0.5).length} transactions were flagged for review.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border shrink-0 flex justify-between items-center">
              <button onClick={reset} className="btn-ghost">
                {step === 'done' ? 'Close' : 'Cancel'}
              </button>
              {step === 'preview' && (
                <button
                  onClick={handleImport}
                  disabled={saving || selectedRows.length === 0}
                  className="btn-primary"
                >
                  {saving ? 'Importing…' : `Import ${selectedRows.length} Transaction${selectedRows.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
