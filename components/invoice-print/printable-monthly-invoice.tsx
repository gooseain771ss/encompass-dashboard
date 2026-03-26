'use client'

import { useState, useCallback } from 'react'
import { Printer, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'

interface InvoiceLine {
  id: string
  date: string
  description: string
  category: string
  notes: string
  amount: number
}

interface FlightGroup {
  flightNumber: string
  dateRange: string
  invoiceALines: InvoiceLine[]
  invoiceBLines: InvoiceLine[]
}

interface MonthlyInvoiceData {
  month: string          // "2026-03"
  monthLabel: string     // "March 2026"
  periodStart: string    // "2026-03-01"
  periodEnd: string      // "2026-03-31"
  flightGroups: FlightGroup[]
  generatedAt: string
}

// ─── Fixed billing entities ────────────────────────────────────────────────
const BILL_TO_A = {
  name: 'SlingShot 100 LLC',
  address: '216 N Market St\nWooster, OH 44691 USA',
}
const BILL_TO_B = {
  name: 'Cape Air Charter',
  address: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
function fmtShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
function fmtMonthFull(month: string) {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Extract just the company name + short location from a verbose description
function vendorDisplay(description: string): string {
  const hyParts = description.split(' - ')
  if (hyParts.length > 1 && hyParts[0].trim().split(' ').length <= 3 &&
      /^(GPU|GPU Service|Fuel|Landing|Parking|Catering|Handling)/i.test(hyParts[0].trim())) {
    return vendorDisplay(hyParts.slice(1).join(' - '))
  }
  const parts = description.split(' – ')
  if (parts.length === 1) {
    const hy = description.split(' - ')
    return hy[hy.length - 1].trim()
  }
  const first = parts[0].trim()
  const second = parts[1].trim()
  const isPurchaseDetail = /^(dinner|lunch|breakfast|brunch|meal|ride|room|hotel|stay|daily|rate|delivery|carry|order|service|charge|infrastructure|overnight|security|facility|\d)/i
  if (second.length <= 20 && !isPurchaseDetail.test(second)) {
    return `${first} – ${second}`
  }
  return first
}

// Extract purchase detail from notes (preferred) or description fallback
function detailDisplay(description: string, rawNotes: string): string {
  const notes = rawNotes
    .replace(/\[flight:\w+\]\s*/g, '')
    .replace(/\.\s*Invoice\s+[\w\-]+\.?/gi, '')
    .split(/\.\s+/).slice(0, 2).join('. ')
    .replace(/\.$/, '')
    .trim()
  const isAccounting = /^(subtotal|total|amount|balance)/i.test(notes)
  if (notes && !isAccounting) return notes

  const hyParts = description.split(' - ')
  if (hyParts.length > 1 && hyParts[0].trim().split(' ').length <= 3 &&
      /^(GPU|GPU Service|Fuel|Landing|Parking|Catering|Handling)/i.test(hyParts[0].trim())) {
    return hyParts[0].trim()
  }
  const parts = description.split(' – ')
  if (parts.length <= 1) return ''
  const vendorPartCount = vendorDisplay(description).split(' – ').length
  const detailParts = parts.slice(vendorPartCount)
  if (detailParts.length === 0) return ''
  return detailParts[0]
    .replace(/\.\s*Invoice\s+[\w\-]+\.?/gi, '')
    .replace(/\.$/, '')
    .trim()
}

// ─── Invoice section (one per invoice type, contains all flight groups) ──────
function MonthlyInvoiceSection({
  invoiceNumber,
  billTo,
  monthLabel,
  periodStart,
  periodEnd,
  flightGroups,
  getLines,
  printClass,
  pageBreak,
}: {
  invoiceNumber: string
  billTo: { name: string; address: string }
  monthLabel: string
  periodStart: string
  periodEnd: string
  flightGroups: FlightGroup[]
  getLines: (g: FlightGroup) => InvoiceLine[]
  printClass: string
  pageBreak: boolean
}) {
  const grandTotal = flightGroups.reduce((sum, g) => sum + getLines(g).reduce((s, l) => s + l.amount, 0), 0)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div
      className={`invoice-page ${printClass} bg-white max-w-[816px] mx-auto mb-8 print:mb-0 shadow-xl print:shadow-none`}
      style={pageBreak ? ({ breakBefore: 'page', pageBreakBefore: 'always' } as React.CSSProperties) : {}}
    >
      {/* ── Bill To + Invoice Meta ── */}
      <div className="px-10 pt-8 pb-4 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Bill To</p>
          <p className="text-sm font-bold text-gray-900">{billTo.name}</p>
          {billTo.address.split('\n').map((l, i) => (
            <p key={i} className="text-xs text-gray-500">{l}</p>
          ))}
        </div>
        <div className="text-right">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/encompass-logo.png" alt="Encompass Aviation" className="h-12 object-contain ml-auto mb-3" />
          <p className="text-xs text-gray-500">Invoice #{invoiceNumber}</p>
          <p className="text-xs text-gray-500">Date: {today}</p>
          <p className="text-xs text-gray-500">Period: {fmtShort(periodStart)} – {fmtShort(periodEnd)}</p>
          <p className="text-xs font-semibold text-gray-700 mt-1">Monthly Invoice — {monthLabel}</p>
        </div>
      </div>

      <div className="mx-10 border-t border-dashed border-gray-300 mb-0" />

      {/* ── Line items grouped by flight ── */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-10 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product or Service</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
              <th className="text-right px-10 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            {flightGroups.map((group) => {
              const lines = getLines(group)
              if (lines.length === 0) return null
              const subtotal = lines.reduce((s, l) => s + l.amount, 0)
              return (
                <>
                  {/* Flight header row */}
                  <tr key={`hdr-${group.flightNumber}`} className="bg-gray-50/70 border-t border-b border-gray-200">
                    <td colSpan={6} className="px-10 py-2">
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Flight #{group.flightNumber}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">{group.dateRange} · N771SS</span>
                    </td>
                  </tr>
                  {/* Line items */}
                  {lines.map((line, i) => (
                    <tr key={line.id} className={`border-b border-gray-100 ${i % 2 !== 0 ? 'bg-gray-50/40' : 'bg-white'}`}>
                      <td className="px-10 py-2.5 text-gray-600 align-top whitespace-nowrap text-xs">{fmtShort(line.date)}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 align-top text-xs">{vendorDisplay(line.description)}</td>
                      <td className="px-3 py-2.5 text-gray-600 align-top text-xs">
                        {detailDisplay(line.description, line.notes) || line.category}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-700 align-top text-xs">1</td>
                      <td className="px-3 py-2.5 text-right text-gray-700 align-top text-xs">{fmt(line.amount)}</td>
                      <td className="px-10 py-2.5 text-right font-semibold text-gray-900 align-top text-xs">{fmt(line.amount)}</td>
                    </tr>
                  ))}
                  {/* Flight subtotal */}
                  <tr key={`sub-${group.flightNumber}`} className="border-b-2 border-gray-300 bg-gray-50">
                    <td colSpan={5} className="px-10 py-2 text-xs font-semibold text-gray-600 text-right">
                      Flight #{group.flightNumber} Subtotal
                    </td>
                    <td className="px-10 py-2 text-xs font-bold text-gray-900 text-right">{fmt(subtotal)}</td>
                  </tr>
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Grand Total ── */}
      <div className="mx-10 mt-4 mb-2">
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-3 border-t-2 border-gray-900">
              <span className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Grand Total</span>
              <span className="text-sm font-extrabold text-gray-900">{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Info ── */}
      <div className="px-10 py-6 grid grid-cols-2 gap-10" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' } as React.CSSProperties}>
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Ways to Pay</p>
          <p className="text-xs text-gray-500 font-semibold">ACH / Wire Transfer</p>
          <p className="text-xs text-gray-500">Bank: Truist Bank</p>
          <p className="text-xs text-gray-500">Routing: 061000227</p>
          <p className="text-xs text-gray-500">Account: 4010153228</p>
          <p className="text-xs text-gray-500 mt-2 font-semibold">Check</p>
          <p className="text-xs text-gray-500">Payable to: Encompass Aviation Inc</p>
          <p className="text-xs text-gray-500">121 Green Park Way, Newnan, GA 30263</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Note to Customer</p>
          <p className="text-xs text-gray-500">
            This is a summary invoice covering all flights during {monthLabel}.
            Individual flight invoices with supporting receipts are available upon request.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Invoice #{invoiceNumber} · Generated {today}
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-gray-200 mx-10 pb-6 pt-3" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Encompass Aviation Inc · 121 Green Park Way · Newnan, GA 30263</p>
          <p className="text-xs text-gray-400">scott@flyencompass.com · (330) 749-4279 · flyencompass.com</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function PrintableMonthlyInvoice({ data }: { data: MonthlyInvoiceData }) {
  const [printMode, setPrintMode] = useState<'A' | 'B' | null>(null)

  const triggerPrint = useCallback((mode: 'A' | 'B') => {
    setPrintMode(mode)
    setTimeout(() => {
      window.print()
      setTimeout(() => setPrintMode(null), 500)
    }, 100)
  }, [])

  const INVOICE_A_CATEGORIES = ['fuel', 'maintenance']
  const INVOICE_B_CATEGORIES = ['fuel_surcharge', 'fbo_fees', 'meals', 'crew', 'catering', 'ground_transport', 'navigation', 'hangar', 'insurance', 'other']

  const invATotal = data.flightGroups.reduce((sum, g) =>
    sum + g.invoiceALines.reduce((s, l) => s + l.amount, 0), 0)
  const invBTotal = data.flightGroups.reduce((sum, g) =>
    sum + g.invoiceBLines.reduce((s, l) => s + l.amount, 0), 0)

  return (
    <div className="invoice-print-wrapper min-h-screen bg-gray-200 py-8 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          html, body { height: auto !important; overflow: visible !important; background: white !important; }
          .invoice-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
          .invoice-print-wrapper { background: white !important; min-height: 0 !important; padding: 0 !important; }
          .print-section-B.hide-on-print { display: none !important; }
          .print-section-A.hide-on-print { display: none !important; }
        }
        @page { margin: 0.4in; size: letter; }
      `}</style>

      {/* ── Controls (no-print) ── */}
      <div className="no-print max-w-[816px] mx-auto mb-6 flex items-center justify-between gap-4 flex-wrap">
        <Link href="/dashboard/finance/invoices" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        <div className="flex gap-3">
          <div className="text-right text-xs text-gray-500 mr-2">
            <p>Invoice A: <span className="font-bold text-gray-800">{fmt(invATotal)}</span></p>
            <p>Invoice B: <span className="font-bold text-gray-800">{fmt(invBTotal)}</span></p>
          </div>
          <button
            onClick={() => triggerPrint('A')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <Printer className="w-4 h-4" />
            SlingShot PDF (A)
          </button>
          <button
            onClick={() => triggerPrint('B')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <Printer className="w-4 h-4" />
            Care Charter PDF (B)
          </button>
        </div>
      </div>

      {/* ── Invoice A (Slingshot) ── */}
      <div className={`print-section-A ${printMode === 'B' ? 'hide-on-print' : ''}`}>
        <MonthlyInvoiceSection
          invoiceNumber={`${data.month}-A`}
          billTo={BILL_TO_A}
          monthLabel={data.monthLabel}
          periodStart={data.periodStart}
          periodEnd={data.periodEnd}
          flightGroups={data.flightGroups}
          getLines={(g) => g.invoiceALines}
          printClass="print-section-A-page"
          pageBreak={false}
        />
      </div>

      {/* ── Invoice B (Care Charter) ── */}
      <div className={`print-section-B ${printMode === 'A' ? 'hide-on-print' : ''}`}>
        <MonthlyInvoiceSection
          invoiceNumber={`${data.month}-B`}
          billTo={BILL_TO_B}
          monthLabel={data.monthLabel}
          periodStart={data.periodStart}
          periodEnd={data.periodEnd}
          flightGroups={data.flightGroups}
          getLines={(g) => g.invoiceBLines}
          printClass="print-section-B-page"
          pageBreak={printMode !== 'B'}
        />
      </div>
    </div>
  )
}
