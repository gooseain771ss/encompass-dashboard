'use client'

import { useState, useCallback, useEffect } from 'react'
import { Printer, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'

interface InvoiceLine {
  id: string
  date: string
  description: string
  category: string
  notes: string
  amount: number
  receiptUrl?: string | null
  receiptStoragePath?: string | null
}

interface InvoiceData {
  flightNumber: string
  aircraft: string
  tripDate: string
  tripDateEnd: string
  billTo: string
  billToAddress: string
  invoiceALines: InvoiceLine[]
  invoiceBLines: InvoiceLine[]
  generatedAt: string
}

// ─── Fixed billing entities per invoice type ─────────────────────────────────
const BILL_TO_A = {
  name: 'SlingShot 100 LLC',
  address: '216 N Market St\nWooster, OH 44691 USA',
}
const BILL_TO_B = {
  name: 'Cape Air Charter',
  address: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
function fmtShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

function dedupeReceipts(lines: InvoiceLine[]): { url: string; label: string; isPdf: boolean }[] {
  const seen = new Map<string, string>()
  for (const line of lines) {
    if (line.receiptUrl && !seen.has(line.receiptUrl)) {
      seen.set(line.receiptUrl, line.description)
    }
  }
  return Array.from(seen.entries()).map(([url, label]) => ({
    url,
    label,
    isPdf: url.toLowerCase().endsWith('.pdf'),
  }))
}

// ─── Receipt pages ────────────────────────────────────────────────────────────
function ReceiptPages({ receipts }: { receipts: { url: string; label: string; isPdf: boolean }[] }) {
  if (receipts.length === 0) return null
  return (
    <>
      {receipts.map((r, i) => (
        <div
          key={r.url}
          className="receipt-page bg-white max-w-[816px] mx-auto mb-8 print:mb-0 shadow-xl print:shadow-none"
          style={{ breakBefore: 'page', pageBreakBefore: 'always' } as React.CSSProperties}
        >
          <div className="flex items-center justify-between px-10 py-4 border-b border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/encompass-logo.png" alt="Encompass Aviation" className="h-10 object-contain" />
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Supporting Receipt {i + 1}</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">{r.label}</p>
            </div>
          </div>
          {r.isPdf ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-600">PDF Receipt — {r.label}</p>
              <a href={r.url} target="_blank" className="mt-3 text-xs text-sky-600 hover:underline no-print">Open PDF ↗</a>
            </div>
          ) : (
            <div className="p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.url}
                alt={`Receipt: ${r.label}`}
                className="w-full h-auto object-contain"
                style={{ display: 'block', maxHeight: 'none' }}
              />
            </div>
          )}
        </div>
      ))}
    </>
  )
}

// ─── Single invoice page ──────────────────────────────────────────────────────
function InvoicePage({
  invoiceNumber,
  title,
  lines,
  billTo,
  flightNumber,
  aircraft,
  tripDate,
  tripDateEnd,
  showReceipts,
  pageBreak,
}: {
  invoiceNumber: string
  title: string
  lines: InvoiceLine[]
  billTo: { name: string; address: string }
  flightNumber: string
  aircraft: string
  tripDate: string
  tripDateEnd: string
  showReceipts: boolean
  pageBreak: boolean
}) {
  const total = lines.reduce((s, l) => s + l.amount, 0)
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  const dueDate = addDays(tripDate, 15)
  const tripLabel = tripDate === tripDateEnd ? fmtShort(tripDate) : `${fmtShort(tripDate)} – ${fmtShort(tripDateEnd)}`
  const receipts = showReceipts ? dedupeReceipts(lines) : []

  return (
    <>
      <div
        className="invoice-page bg-white max-w-[816px] mx-auto mb-8 print:mb-0 shadow-xl print:shadow-none"
        style={pageBreak ? ({ breakBefore: 'page', pageBreakBefore: 'always' } as React.CSSProperties) : {}}
      >
        {/* ── Top header ── */}
        <div className="flex items-start justify-between px-10 pt-10 pb-6">
          <div>
            <p className="text-3xl font-extrabold tracking-widest text-gray-900 mb-4">INVOICE</p>
            <p className="text-sm font-bold text-gray-800">Encompass Aviation Inc</p>
            <p className="text-xs text-gray-500">121 Green Park Way</p>
            <p className="text-xs text-gray-500">Newnan, GA 30263-6288</p>
            <p className="text-xs text-gray-500 mt-1">scott@flyencompass.com</p>
            <p className="text-xs text-gray-500">+1 (330) 749-4279</p>
            <p className="text-xs text-gray-500">www.flyencompass.com</p>
          </div>
          <div className="text-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/encompass-logo.png"
              alt="Encompass Aviation"
              className="h-16 object-contain ml-auto"
            />
          </div>
        </div>

        {/* ── Dashed divider ── */}
        <div className="mx-10 border-t border-dashed border-gray-300 mb-0" />

        {/* ── Bill To + Invoice Details ── */}
        <div className="bg-gray-50 mx-0 px-10 py-5 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-bold text-gray-700 mb-1">Bill to</p>
            <p className="text-sm font-semibold text-gray-800">{billTo.name}</p>
            {billTo.address.split('\n').map((line, i) => (
              <p key={i} className="text-sm text-gray-600">{line}</p>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Invoice details</p>
            <div className="space-y-0.5 text-sm">
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Invoice no.</span>
                <span className="font-medium text-gray-800">{invoiceNumber}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Terms</span>
                <span className="font-medium text-gray-800">Net 15</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Invoice date</span>
                <span className="font-medium text-gray-800">{today}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Due date</span>
                <span className="font-medium text-gray-800">{dueDate}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Flight #</span>
                <span className="font-medium text-gray-800">{flightNumber}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Aircraft</span>
                <span className="font-medium text-gray-800">{aircraft}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Trip date(s)</span>
                <span className="font-medium text-gray-800">{tripLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Line items table ── */}
        <div className="mx-0 mt-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#3D4A4A' }}>
                <th className="text-left px-10 py-3 text-xs font-semibold text-white uppercase tracking-wide w-28">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Product or service</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide">Description</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide w-16">Qty</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-white uppercase tracking-wide w-24">Rate</th>
                <th className="text-right px-10 py-3 text-xs font-semibold text-white uppercase tracking-wide w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-10 py-8 text-center text-gray-400 italic">No line items</td>
                </tr>
              ) : (
                lines.map((line, i) => (
                  <tr key={line.id} className={`border-b border-gray-100 ${i % 2 !== 0 ? 'bg-gray-50/40' : 'bg-white'}`}>
                    <td className="px-10 py-3 text-gray-600 align-top whitespace-nowrap">{fmtShort(line.date)}</td>
                    <td className="px-3 py-3 font-semibold text-gray-800 align-top">{line.description}</td>
                    <td className="px-3 py-3 text-gray-600 align-top">
                      <div>{line.category}</div>
                      {line.notes && <div className="text-xs text-gray-400 mt-0.5">{line.notes}</div>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-700 align-top">1</td>
                    <td className="px-3 py-3 text-right text-gray-700 align-top">{fmt(line.amount)}</td>
                    <td className="px-10 py-3 text-right font-semibold text-gray-900 align-top">{fmt(line.amount)}</td>
                  </tr>
                ))
              )}
              <tr className="border-t-2 border-gray-800">
                <td colSpan={5} className="px-10 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wide">Total</td>
                <td className="px-10 py-4 text-right text-xl font-extrabold text-gray-900">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Payment + Note ── */}
        <div className="px-10 py-8 grid grid-cols-2 gap-10">
          <div>
            <p className="text-lg font-bold text-gray-900 mb-3">Ways to pay</p>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-block bg-gray-700 text-white text-xs font-bold px-2 py-0.5 rounded">BANK</span>
              <div className="text-sm text-gray-600 space-y-0.5">
                <p>Please submit payment via ACH to Wells Fargo</p>
                <p>Account # <span className="font-semibold text-gray-800">7696386163</span></p>
                <p>Routing # <span className="font-semibold text-gray-800">061000227</span></p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 mb-3">Note to customer</p>
            <p className="text-sm text-gray-600">
              {title.includes('Fuel')
                ? 'Fuel charges at base rate per wet-rate agreement (≤ $4.00/gal). Surcharge billed separately.'
                : 'Thank you for flying with Encompass Aviation. Looking forward to our next flight!'}
            </p>
            {receipts.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {receipts.length} supporting receipt{receipts.length > 1 ? 's' : ''} attached on the following page{receipts.length > 1 ? 's' : ''}.
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-200 mx-10 pb-8 pt-4">
          <p className="text-xs text-gray-400 text-center">
            Encompass Aviation Inc · 121 Green Park Way, Newnan, GA 30263-6288 · scott@flyencompass.com · +1 (330) 749-4279
          </p>
        </div>
      </div>

      {/* Receipt pages */}
      <ReceiptPages receipts={receipts} />
    </>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────
export function PrintableInvoice({ data }: { data: InvoiceData }) {
  const [showReceipts, setShowReceipts] = useState(true)
  // 'all' | 'A' | 'B' — controls which invoice section renders during print
  const [printMode, setPrintMode] = useState<'all' | 'A' | 'B'>('all')

  // Fix: dashboard layout has overflow-hidden/overflow-y-auto containers that
  // clip the print output to just the visible viewport. We use beforeprint/afterprint
  // events to temporarily disable all overflow constraints, then restore them.
  useEffect(() => {
    function beforePrint() {
      document.querySelectorAll<HTMLElement>('*').forEach(el => {
        const style = window.getComputedStyle(el)
        const ov = style.overflow
        const ovY = style.overflowY
        const h = style.height
        if (
          ov === 'hidden' || ov === 'auto' || ov === 'scroll' ||
          ovY === 'auto' || ovY === 'scroll' || ovY === 'hidden'
        ) {
          el.dataset.printOverflow = el.style.overflow
          el.dataset.printOverflowY = el.style.overflowY
          el.dataset.printHeight = el.style.height
          el.style.overflow = 'visible'
          el.style.overflowY = 'visible'
          el.style.height = 'auto'
        }
      })
    }

    function afterPrint() {
      document.querySelectorAll<HTMLElement>('[data-print-overflow]').forEach(el => {
        el.style.overflow = el.dataset.printOverflow ?? ''
        el.style.overflowY = el.dataset.printOverflowY ?? ''
        el.style.height = el.dataset.printHeight ?? ''
        delete el.dataset.printOverflow
        delete el.dataset.printOverflowY
        delete el.dataset.printHeight
      })
    }

    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [])

  const totalA = data.invoiceALines.reduce((s, l) => s + l.amount, 0)
  const totalB = data.invoiceBLines.reduce((s, l) => s + l.amount, 0)
  const receiptCountA = dedupeReceipts(data.invoiceALines).length
  const receiptCountB = dedupeReceipts(data.invoiceBLines).length

  const triggerPrint = useCallback((mode: 'all' | 'A' | 'B') => {
    setPrintMode(mode)
    // Double rAF ensures React has flushed state + browser has re-rendered
    // before the print dialog opens
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print()
        // Reset after print dialog closes (slight delay for safety)
        setTimeout(() => setPrintMode('all'), 500)
      })
    })
  }, [])

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          /* Fix: ensure full page height is printable, not just visible viewport */
          html, body {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
          }
          body { background: white !important; }
          .invoice-page, .receipt-page {
            box-shadow: none !important;
            margin: 0 !important;
          }
          /* Hide Invoice B section when printing A-only */
          .print-section-B.hide-on-print { display: none !important; }
          /* Hide Invoice A section when printing B-only */
          .print-section-A.hide-on-print { display: none !important; }
        }
        @page { margin: 0; size: letter; }
      `}</style>

      {/* Controls bar — hidden on print */}
      <div className="no-print sticky top-0 z-50 bg-card border-b border-border px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance/invoices" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-semibold text-foreground">
            Flight #{data.flightNumber} — Invoices
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            A: {fmt(totalA)} · B: {fmt(totalB)} · Total: {fmt(totalA + totalB)}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showReceipts}
              onChange={e => setShowReceipts(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            Include receipts
            <span className="text-xs text-muted-foreground/60">
              ({receiptCountA + receiptCountB} imgs)
            </span>
          </label>

          {/* Slingshot-only print */}
          <button
            onClick={() => triggerPrint('A')}
            className="btn-primary flex items-center gap-2 bg-sky-700 hover:bg-sky-800"
            title="Print Invoice A + receipts — billed to SlingShot 100 LLC"
          >
            <Printer className="w-4 h-4" />
            Slingshot PDF
          </button>

          {/* Care Charter-only print */}
          <button
            onClick={() => triggerPrint('B')}
            className="btn-primary flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800"
            title="Print Invoice B + receipts — billed to Cape Air Charter"
          >
            <Printer className="w-4 h-4" />
            Care Charter PDF
          </button>

          {/* Print both */}
          <button
            onClick={() => triggerPrint('all')}
            className="btn-primary flex items-center gap-2"
            title="Print both invoices with all receipts"
          >
            <Printer className="w-4 h-4" />
            Print All
          </button>
        </div>
      </div>

      {/* Invoice pages */}
      <div className="bg-gray-300 min-h-screen py-8 px-4 print:bg-white print:p-0">

        {/* Invoice A — SlingShot */}
        <div className={`print-section-A${printMode === 'B' ? ' hide-on-print' : ''}`}>
          <InvoicePage
            invoiceNumber={`${data.flightNumber}-A`}
            title="Invoice A — Fuel Base Cost"
            lines={data.invoiceALines}
            billTo={BILL_TO_A}
            flightNumber={data.flightNumber}
            aircraft={data.aircraft}
            tripDate={data.tripDate}
            tripDateEnd={data.tripDateEnd}
            showReceipts={showReceipts}
            pageBreak={false}
          />
        </div>

        {/* Invoice B — Care Charter */}
        <div className={`print-section-B${printMode === 'A' ? ' hide-on-print' : ''}`}>
          <InvoicePage
            invoiceNumber={`${data.flightNumber}-B`}
            title="Invoice B — Operating Expenses"
            lines={data.invoiceBLines}
            billTo={BILL_TO_B}
            flightNumber={data.flightNumber}
            aircraft={data.aircraft}
            tripDate={data.tripDate}
            tripDateEnd={data.tripDateEnd}
            showReceipts={showReceipts}
            pageBreak={printMode !== 'B'} // no forced page break if B is the only thing printing
          />
        </div>

      </div>
    </>
  )
}
