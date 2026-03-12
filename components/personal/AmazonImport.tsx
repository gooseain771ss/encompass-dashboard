'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Check, AlertCircle, Info, ShoppingBag } from 'lucide-react'
import { guessAmazonSubcategory, getCategoryDef } from './categories'

interface Account {
  id: string
  name: string
  institution: string | null
}

interface AmazonRow {
  orderId: string
  date: string
  title: string
  quantity: number
  unitPrice: number
  amount: number
  subcategory: string
  confidence: number
  selected: boolean
  amazonCategory: string
}

interface Props {
  accounts: Account[]
}

const AMAZON_SUBCATEGORIES = getCategoryDef('Amazon')?.subcategories ?? [
  'Auto & Automotive', 'Baby & Kids', 'Beauty & Personal Care', 'Books & Media',
  'Clothing & Apparel', 'Electronics & Tech', 'Groceries & Food', 'Health & Supplements',
  'Home & Kitchen', 'Office & School Supplies', 'Pet Supplies', 'Sports & Outdoors',
  'Tools & Hardware', 'Toys & Games', 'Other',
]

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

function parseDate(raw: string): string {
  const clean = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
  const mdy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  const mdyDash = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (mdyDash) return `${mdyDash[3]}-${mdyDash[1].padStart(2, '0')}-${mdyDash[2].padStart(2, '0')}`
  // Try JS Date parsing as fallback
  const d = new Date(clean)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }
  return clean
}

function findCol(headers: string[], ...names: string[]): number {
  const h = headers.map(s => s.toLowerCase().trim())
  for (const name of names) {
    const idx = h.findIndex(s => s === name.toLowerCase() || s.includes(name.toLowerCase()))
    if (idx !== -1) return idx
  }
  return -1
}

function parseAmazonCSV(text: string): { rows: AmazonRow[]; error?: string } {
  const allRows = parseCSV(text)
  if (allRows.length < 2) return { rows: [], error: 'CSV appears empty or unreadable.' }

  const headers = allRows[0]

  const dateIdx = findCol(headers, 'Order Date', 'Shipment Date', 'Date')
  const titleIdx = findCol(headers, 'Title', 'Product Name', 'Item Name')
  const priceIdx = findCol(headers, 'Purchase Price Per Unit', 'Unit Price', 'Item Total', 'Price')
  const qtyIdx = findCol(headers, 'Quantity', 'Qty')
  const orderIdIdx = findCol(headers, 'Order ID', 'Order Id', 'OrderId')
  const categoryIdx = findCol(headers, 'Category')

  if (titleIdx === -1) {
    return { rows: [], error: 'Could not find a product title column (expected "Title" or "Product Name"). Is this an Amazon Items report?' }
  }
  if (dateIdx === -1) {
    return { rows: [], error: 'Could not find a date column (expected "Order Date" or "Shipment Date").' }
  }

  const rows: AmazonRow[] = []
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i]
    if (row.length < 2) continue

    const rawTitle = row[titleIdx]?.trim() || ''
    if (!rawTitle) continue

    const rawDate = row[dateIdx]?.trim() || ''
    const date = parseDate(rawDate)

    const rawPrice = priceIdx !== -1 ? (row[priceIdx] || '0') : '0'
    const unitPrice = parseFloat(rawPrice.replace(/[$,]/g, '')) || 0

    const rawQty = qtyIdx !== -1 ? (row[qtyIdx] || '1') : '1'
    const quantity = parseInt(rawQty, 10) || 1

    const amount = unitPrice * quantity
    if (amount <= 0) continue

    const orderId = orderIdIdx !== -1 ? (row[orderIdIdx]?.trim() || '') : ''
    const amazonCategory = categoryIdx !== -1 ? (row[categoryIdx]?.trim() || '') : ''

    const { subcategory, confidence } = guessAmazonSubcategory(rawTitle)

    rows.push({
      orderId,
      date,
      title: rawTitle,
      quantity,
      unitPrice,
      amount,
      subcategory,
      confidence,
      selected: true,
      amazonCategory,
    })
  }

  if (rows.length === 0) {
    return { rows: [], error: 'No valid line items found. Make sure you exported the "Items" report type from Amazon.' }
  }

  return { rows }
}

export function AmazonImport({ accounts }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload')
  const [rows, setRows] = useState<AmazonRow[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importedCount, setImportedCount] = useState(0)
  const [importedTotal, setImportedTotal] = useState(0)
  const [importedOrders, setImportedOrders] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const { rows: parsed, error: parseError } = parseAmazonCSV(text)
      if (parseError) { setError(parseError); return }
      setRows(parsed)
      setStep('review')
      setError('')
    }
    reader.readAsText(file)
  }

  function toggleRow(idx: number) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r))
  }

  function updateSubcategory(idx: number, subcategory: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, subcategory } : r))
  }

  async function handleImport() {
    setSaving(true)
    const selected = rows.filter(r => r.selected)
    const inserts = selected.map(r => ({
      transaction_date: r.date,
      description: r.title,
      merchant: 'Amazon',
      amount: -r.amount,
      is_income: false,
      category: 'Amazon',
      subcategory: r.subcategory,
      source: 'amazon_import',
      needs_review: r.confidence < 0.6,
      confidence_score: r.confidence,
      reference_number: r.orderId || null,
      account_id: selectedAccount || null,
    }))

    const { error: dbError } = await supabase.from('personal_transactions').insert(inserts)
    setSaving(false)
    if (!dbError) {
      const uniqueOrders = new Set(selected.map(r => r.orderId).filter(Boolean)).size
      setImportedCount(selected.length)
      setImportedTotal(selected.reduce((s, r) => s + r.amount, 0))
      setImportedOrders(uniqueOrders)
      setStep('done')
      router.refresh()
    } else {
      setError('Import failed: ' + dbError.message)
    }
  }

  function reset() {
    setStep('upload')
    setRows([])
    setError('')
    setImportedCount(0)
    setImportedTotal(0)
    setImportedOrders(0)
    if (fileRef.current) fileRef.current.value = ''
    setOpen(false)
  }

  // Group rows by orderId for display
  const groupedRows = rows.reduce<{ orderId: string; items: { row: AmazonRow; idx: number }[] }[]>((groups, row, idx) => {
    const existing = groups.find(g => g.orderId === row.orderId)
    if (existing) {
      existing.items.push({ row, idx })
    } else {
      groups.push({ orderId: row.orderId, items: [{ row, idx }] })
    }
    return groups
  }, [])

  const selectedRows = rows.filter(r => r.selected)
  const selectedTotal = selectedRows.reduce((s, r) => s + r.amount, 0)
  const uniqueOrderCount = new Set(rows.map(r => r.orderId).filter(Boolean)).size

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        <ShoppingBag className="w-4 h-4" />
        Import Amazon
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl w-full max-w-5xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-foreground">Import Amazon Order History</h2>
              </div>
              <button onClick={reset} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Step 1: Upload */}
              {step === 'upload' && (
                <div className="p-8 flex flex-col items-center gap-6">
                  <div className="w-full max-w-lg">
                    <label className="block w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-amber-500/50 transition-colors">
                      <ShoppingBag className="w-10 h-10 text-amber-400/60 mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">Drop Amazon CSV or click to browse</p>
                      <p className="text-xs text-muted-foreground">Select your Amazon Items order history export</p>
                      <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
                    </label>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3 w-full max-w-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="bg-amber-900/10 border border-amber-800/30 rounded-xl p-5 max-w-lg w-full">
                    <div className="flex items-start gap-2 mb-3">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-amber-300">How to download your Amazon order history</p>
                    </div>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>Go to <strong className="text-foreground">amazon.com</strong> → Returns &amp; Orders → Order History Reports</li>
                      <li>Select report type: <strong className="text-foreground">Items</strong></li>
                      <li>Choose your date range</li>
                      <li>Click <strong className="text-foreground">Request Report</strong>, then download the CSV when ready</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Step 2: Review */}
              {step === 'review' && (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <p className="text-sm text-foreground font-medium">
                        {rows.length} items from {uniqueOrderCount} order{uniqueOrderCount !== 1 ? 's' : ''} — Total: ${selectedTotal.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedRows.length} selected · Amber rows have lower confidence subcategory guesses
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
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
                        <button onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: true })))} className="btn-ghost text-xs">Select All</button>
                        <button onClick={() => setRows(prev => prev.map(r => ({ ...r, selected: false })))} className="btn-ghost text-xs">Deselect All</button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-2 mb-3">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-3 py-2 text-left w-8"></th>
                          <th className="px-3 py-2 text-left whitespace-nowrap">Order Date</th>
                          <th className="px-3 py-2 text-left">Product Title</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right whitespace-nowrap">Unit Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-left">Subcategory</th>
                          <th className="px-3 py-2 text-center">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {groupedRows.map((group) => (
                          group.items.map(({ row, idx }, itemIdx) => (
                            <tr
                              key={idx}
                              className={`transition-colors ${
                                !row.selected
                                  ? 'bg-muted/10 opacity-50'
                                  : row.confidence < 0.6
                                    ? 'bg-amber-900/10'
                                    : 'bg-card'
                              } ${itemIdx === 0 && group.orderId ? 'border-t-2 border-t-border/60' : ''}`}
                            >
                              <td className="px-3 py-1.5">
                                <input type="checkbox" checked={row.selected} onChange={() => toggleRow(idx)} className="rounded" />
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{row.date}</td>
                              <td className="px-3 py-1.5 max-w-xs">
                                <span title={row.title} className="block truncate max-w-[220px]">{row.title}</span>
                                {row.amazonCategory && (
                                  <span className="text-muted-foreground/60 text-[10px]">{row.amazonCategory}</span>
                                )}
                                {row.orderId && itemIdx === 0 && (
                                  <span className="text-muted-foreground/40 text-[10px] block">#{row.orderId}</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-center text-muted-foreground">{row.quantity}</td>
                              <td className="px-3 py-1.5 text-right text-muted-foreground">${row.unitPrice.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-right font-semibold text-red-400">${row.amount.toFixed(2)}</td>
                              <td className="px-3 py-1.5">
                                <select
                                  value={row.subcategory}
                                  onChange={e => updateSubcategory(idx, e.target.value)}
                                  className="input-base text-xs py-0.5 px-2"
                                >
                                  {AMAZON_SUBCATEGORIES.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  row.confidence >= 0.7
                                    ? 'bg-emerald-900/40 text-emerald-400'
                                    : row.confidence >= 0.6
                                      ? 'bg-blue-900/40 text-blue-400'
                                      : 'bg-amber-900/40 text-amber-400'
                                }`}>
                                  {row.confidence >= 0.7 ? 'High' : row.confidence >= 0.6 ? 'Med' : 'Low'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ))}
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
                  <h3 className="text-xl font-semibold text-foreground">Amazon Import Complete!</h3>
                  <p className="text-muted-foreground text-sm">
                    <strong className="text-foreground">{importedCount}</strong> items from{' '}
                    <strong className="text-foreground">{importedOrders}</strong> order{importedOrders !== 1 ? 's' : ''} imported —{' '}
                    <strong className="text-foreground">${importedTotal.toFixed(2)}</strong> total
                  </p>
                  <div className="mt-2 bg-blue-900/20 border border-blue-800/30 rounded-lg px-5 py-3 max-w-sm">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground text-left">
                        Amazon transactions in your bank/CC CSV will be automatically skipped during future imports to avoid double-counting.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border shrink-0 flex justify-between items-center">
              <button onClick={reset} className="btn-ghost">
                {step === 'done' ? 'Close' : 'Cancel'}
              </button>
              {step === 'review' && (
                <button
                  onClick={handleImport}
                  disabled={saving || selectedRows.length === 0}
                  className="btn-primary"
                >
                  {saving ? 'Importing…' : `Import ${selectedRows.length} Item${selectedRows.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
