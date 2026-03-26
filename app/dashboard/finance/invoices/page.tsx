import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, ChevronRight, Fuel, ReceiptText, Printer, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

const INVOICE_A_CATEGORIES = ['fuel']
const INVOICE_B_CATEGORIES = ['fuel_surcharge', 'fbo_fees', 'meals', 'maintenance', 'crew', 'catering', 'ground_transport', 'navigation', 'hangar', 'insurance', 'other']

const categoryLabels: Record<string, string> = {
  fuel: 'Fuel',
  fuel_surcharge: 'Fuel Surcharge',
  fbo_fees: 'FBO Fees',
  meals: 'Meals',
  maintenance: 'Maintenance',
  crew: 'Crew / Lodging',
  catering: 'Catering',
  ground_transport: 'Ground Transport',
  navigation: 'Navigation',
  hangar: 'Hangar',
  insurance: 'Insurance',
  other: 'Other',
}

function parseFlightNumber(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/\[flight:(\w+)\]/)
  return match ? match[1] : null
}

interface SearchParams {
  from?: string
  to?: string
  flight?: string
}

export default async function InvoicesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()

  const fromDate = searchParams.from || format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
  const toDate = searchParams.to || format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, aircraft(name, registration)')
    .gte('transaction_date', fromDate)
    .lte('transaction_date', toDate)
    .eq('is_income', false)
    .order('transaction_date', { ascending: true })

  // Group by flight number
  const flightMap: Record<string, {
    flightNumber: string
    transactions: typeof transactions
    minDate: string
    maxDate: string
    aircraft: string
  }> = {}

  const untagged: typeof transactions = []

  transactions?.forEach(t => {
    const fn = parseFlightNumber(t.notes)
    if (!fn) {
      untagged?.push(t)
      return
    }
    if (!flightMap[fn]) {
      flightMap[fn] = {
        flightNumber: fn,
        transactions: [],
        minDate: t.transaction_date,
        maxDate: t.transaction_date,
        aircraft: (t.aircraft as any)?.registration || '—',
      }
    }
    flightMap[fn].transactions!.push(t)
    if (t.transaction_date < flightMap[fn].minDate) flightMap[fn].minDate = t.transaction_date
    if (t.transaction_date > flightMap[fn].maxDate) flightMap[fn].maxDate = t.transaction_date
  })

  const flights = Object.values(flightMap).sort((a, b) => b.minDate.localeCompare(a.minDate))

  // Filter by flight if requested
  const selectedFlight = searchParams.flight ? flightMap[searchParams.flight] : null

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/finance" className="text-muted-foreground hover:text-foreground text-sm">
            Finance
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        </div>
        {/* Monthly invoice shortcut — current month and previous month */}
        <div className="flex gap-2 flex-wrap">
          {[0, 1].map(offset => {
            const d = subMonths(new Date(), offset)
            const m = format(d, 'yyyy-MM')
            const label = offset === 0 ? 'This Month' : format(d, 'MMM yyyy')
            return (
              <Link
                key={m}
                href={`/dashboard/finance/invoices/monthly/${m}`}
                target="_blank"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Monthly Invoice — {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Date filter */}
      <form className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label mb-1.5 block">From</label>
          <input type="date" name="from" defaultValue={fromDate} className="input-base" />
        </div>
        <div>
          <label className="form-label mb-1.5 block">To</label>
          <input type="date" name="to" defaultValue={toDate} className="input-base" />
        </div>
        <button type="submit" className="btn-secondary">Apply</button>
        <a href="/dashboard/finance/invoices" className="btn-ghost">Reset</a>
      </form>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Flight list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="section-header">Flights ({flights.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {flights.map(f => {
              const invA = f.transactions!.filter(t => INVOICE_A_CATEGORIES.includes(t.category))
                .reduce((s, t) => s + Math.abs(t.amount), 0)
              const invB = f.transactions!.filter(t => INVOICE_B_CATEGORIES.includes(t.category))
                .reduce((s, t) => s + Math.abs(t.amount), 0)
              const isSelected = searchParams.flight === f.flightNumber
              return (
                <Link
                  key={f.flightNumber}
                  href={`/dashboard/finance/invoices?from=${fromDate}&to=${toDate}&flight=${f.flightNumber}`}
                  className={`block px-5 py-4 hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Flight #{f.flightNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.aircraft} · {formatDate(f.minDate)}</p>
                      <p className="text-xs text-muted-foreground">{f.transactions!.length} transactions</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(invA + invB)}</p>
                      <p className="text-xs text-muted-foreground">total</p>
                    </div>
                  </div>
                </Link>
              )
            })}
            {flights.length === 0 && (
              <div className="px-5 py-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tagged flights in period</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoice detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedFlight ? (
            <>
              <InvoiceCard
                label="Invoice A — Fuel Base"
                subtitle="Fuel charges at base rate (≤$4.00/gal)"
                icon={<Fuel className="w-4 h-4 text-blue-400" />}
                iconBg="bg-blue-400/10 border-blue-400/20"
                transactions={selectedFlight.transactions!.filter(t => INVOICE_A_CATEGORIES.includes(t.category))}
              />
              <InvoiceCard
                label="Invoice B — Operating Expenses"
                subtitle="Fuel surcharge, FBO fees, meals, maintenance & crew"
                icon={<ReceiptText className="w-4 h-4 text-amber-400" />}
                iconBg="bg-amber-400/10 border-amber-400/20"
                transactions={selectedFlight.transactions!.filter(t => INVOICE_B_CATEGORIES.includes(t.category))}
              />

              {/* Grand total + print button */}
              {(() => {
                const all = selectedFlight.transactions!
                const invA = all.filter(t => INVOICE_A_CATEGORIES.includes(t.category)).reduce((s, t) => s + Math.abs(t.amount), 0)
                const invB = all.filter(t => INVOICE_B_CATEGORIES.includes(t.category)).reduce((s, t) => s + Math.abs(t.amount), 0)
                return (
                  <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Flight #{selectedFlight.flightNumber} Total</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Invoice A + Invoice B</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{formatCurrency(invA + invB)}</p>
                        <p className="text-xs text-muted-foreground">{all.length} line items</p>
                      </div>
                      <Link
                        href={`/dashboard/finance/invoices/${selectedFlight.flightNumber}`}
                        target="_blank"
                        className="btn-primary flex items-center gap-2 shrink-0"
                      >
                        <Printer className="w-4 h-4" />
                        Print / PDF
                      </Link>
                    </div>
                  </div>
                )
              })()}
            </>
          ) : (
            <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Select a flight to view its invoice</p>
              <p className="text-xs text-muted-foreground mt-1">Invoice A = fuel base · Invoice B = all other charges</p>
            </div>
          )}
        </div>
      </div>

      {/* Untagged transactions */}
      {untagged && untagged.length > 0 && (
        <div className="bg-card border border-amber-800/30 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="section-header text-amber-400">Untagged Transactions ({untagged.length})</h2>
            <p className="text-xs text-muted-foreground">Not linked to any flight number</p>
          </div>
          <div className="divide-y divide-border">
            {untagged.map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.transaction_date)} · {categoryLabels[t.category] || t.category}</p>
                </div>
                <p className="text-sm font-semibold text-red-400">-{formatCurrency(Math.abs(t.amount))}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function InvoiceCard({
  label,
  subtitle,
  icon,
  iconBg,
  transactions,
}: {
  label: string
  subtitle: string
  icon: React.ReactNode
  iconBg: string
  transactions: any[]
}) {
  const total = transactions.reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <p className="text-lg font-bold text-foreground">{formatCurrency(total)}</p>
      </div>
      {transactions.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/10">
              <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground uppercase">Date</th>
              <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground uppercase">Description</th>
              <th className="text-left px-5 py-2 text-xs font-medium text-muted-foreground uppercase">Category</th>
              <th className="text-right px-5 py-2 text-xs font-medium text-muted-foreground uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.map(t => (
              <tr key={t.id} className="table-row-hover">
                <td className="px-5 py-2.5 text-sm text-muted-foreground whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                <td className="px-5 py-2.5 text-sm text-foreground">
                  {t.description}
                  {t.receipt_url && (
                    <a href={t.receipt_url} target="_blank" className="ml-2 text-xs text-primary hover:underline">receipt</a>
                  )}
                </td>
                <td className="px-5 py-2.5">
                  <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded capitalize">
                    {categoryLabels[t.category] || t.category}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right text-sm font-semibold text-red-400">
                  -{formatCurrency(Math.abs(t.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-5 py-6 text-sm text-muted-foreground text-center">No line items</p>
      )}
    </div>
  )
}
