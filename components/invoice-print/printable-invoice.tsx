'use client'

import { useState } from 'react'
import { Printer, ArrowLeft, Plane } from 'lucide-react'
import Link from 'next/link'

interface InvoiceLine {
  id: string
  date: string
  description: string
  category: string
  notes: string
  amount: number
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

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function InvoiceSection({
  invoiceNumber,
  title,
  subtitle,
  lines,
  flightNumber,
  aircraft,
  tripDate,
  tripDateEnd,
  billTo,
  billToAddress,
}: {
  invoiceNumber: string
  title: string
  subtitle: string
  lines: InvoiceLine[]
  flightNumber: string
  aircraft: string
  tripDate: string
  tripDateEnd: string
  billTo: string
  billToAddress: string
}) {
  const total = lines.reduce((s, l) => s + l.amount, 0)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="invoice-page bg-white text-gray-900 p-12 max-w-[800px] mx-auto mb-8 print:mb-0 print:shadow-none shadow-xl rounded-lg">

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Encompass Aviation</span>
          </div>
          <p className="text-sm text-gray-500 ml-10">Cape Girardeau, MO · flyencompass.com</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">INVOICE</p>
          <p className="text-sm text-gray-500 mt-1">#{invoiceNumber}</p>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
      </div>

      {/* Bill From / Bill To */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">From</p>
          <p className="text-sm font-semibold text-gray-800">Encompass Aviation LLC</p>
          <p className="text-sm text-gray-600">Cape Girardeau, MO</p>
          <p className="text-sm text-gray-600">flyencompass.com</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
          {billTo ? (
            <>
              <p className="text-sm font-semibold text-gray-800">{billTo}</p>
              {billToAddress && <p className="text-sm text-gray-600 whitespace-pre-line">{billToAddress}</p>}
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">—</p>
          )}
        </div>
      </div>

      {/* Trip details */}
      <div className="bg-gray-50 rounded-lg px-5 py-3 mb-8 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Flight #</p>
          <p className="font-semibold text-gray-800">{flightNumber}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Aircraft</p>
          <p className="font-semibold text-gray-800">{aircraft}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Trip Date(s)</p>
          <p className="font-semibold text-gray-800">
            {tripDate === tripDateEnd ? fmtShort(tripDate) : `${fmtShort(tripDate)} – ${fmtShort(tripDateEnd)}`}
          </p>
        </div>
      </div>

      {/* Invoice type label */}
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>

      {/* Line items table */}
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
            <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-gray-400 italic text-sm">No line items</td>
            </tr>
          ) : (
            lines.map((line, i) => (
              <tr key={line.id} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">{fmtShort(line.date)}</td>
                <td className="py-2.5 pr-4 text-gray-800">
                  <div>{line.description}</div>
                  {line.notes && <div className="text-xs text-gray-400 mt-0.5">{line.notes}</div>}
                </td>
                <td className="py-2.5 pr-4">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {line.category}
                  </span>
                </td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{fmt(line.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex justify-end mb-10">
        <div className="w-60">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Subtotal</span>
            <span>{fmt(total)}</span>
          </div>
          <div className="border-t-2 border-gray-800 pt-2 flex justify-between">
            <span className="font-bold text-gray-900">Total Due</span>
            <span className="font-bold text-lg text-gray-900">{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 text-xs text-gray-400 text-center">
        Encompass Aviation LLC · flyencompass.com · Thank you for flying with us.
      </div>
    </div>
  )
}

export function PrintableInvoice({ data }: { data: InvoiceData }) {
  const [billTo, setBillTo] = useState(data.billTo)
  const [billToAddress, setBillToAddress] = useState(data.billToAddress)
  const totalA = data.invoiceALines.reduce((s, l) => s + l.amount, 0)
  const totalB = data.invoiceBLines.reduce((s, l) => s + l.amount, 0)

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
        }
        @page { margin: 0.5in; size: letter; }
      `}</style>

      {/* Controls bar — hidden on print */}
      <div className="no-print sticky top-0 z-50 bg-card border-b border-border px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance/invoices" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm font-semibold text-foreground">
            Flight #{data.flightNumber} — Printable Invoices
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            A: {fmt(totalA)} · B: {fmt(totalB)} · Total: {fmt(totalA + totalB)}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Bill To quick fill */}
          <input
            type="text"
            placeholder="Bill To (name/company)"
            value={billTo}
            onChange={e => setBillTo(e.target.value)}
            className="input-base text-sm w-48"
          />
          <input
            type="text"
            placeholder="Address (optional)"
            value={billToAddress}
            onChange={e => setBillToAddress(e.target.value)}
            className="input-base text-sm w-44"
          />
          <button
            onClick={() => window.print()}
            className="btn-primary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Invoice pages */}
      <div className="bg-gray-200 min-h-screen py-8 px-4 print:bg-white print:p-0">
        <InvoiceSection
          invoiceNumber={`${data.flightNumber}-A`}
          title="Invoice A — Fuel Base Cost"
          subtitle="Fuel charges at base rate (≤ $4.00/gal)"
          lines={data.invoiceALines}
          flightNumber={data.flightNumber}
          aircraft={data.aircraft}
          tripDate={data.tripDate}
          tripDateEnd={data.tripDateEnd}
          billTo={billTo}
          billToAddress={billToAddress}
        />
        <InvoiceSection
          invoiceNumber={`${data.flightNumber}-B`}
          title="Invoice B — Operating Expenses"
          subtitle="Fuel surcharge, FBO fees, crew, meals, and other trip costs"
          lines={data.invoiceBLines}
          flightNumber={data.flightNumber}
          aircraft={data.aircraft}
          tripDate={data.tripDate}
          tripDateEnd={data.tripDateEnd}
          billTo={billTo}
          billToAddress={billToAddress}
        />
      </div>
    </>
  )
}
