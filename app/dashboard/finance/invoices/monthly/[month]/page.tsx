import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PrintableMonthlyInvoice } from '@/components/invoice-print/printable-monthly-invoice'

const INVOICE_A_CATEGORIES = ['fuel', 'maintenance']
const INVOICE_B_CATEGORIES = ['fuel_surcharge', 'fbo_fees', 'meals', 'crew', 'catering', 'ground_transport', 'navigation', 'hangar', 'insurance', 'other']

const categoryLabels: Record<string, string> = {
  fuel: 'Fuel (Base Rate)',
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

function fmtShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function monthLabel(month: string) {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function MonthlyInvoicePage({ params }: { params: { month: string } }) {
  // Validate format: YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(params.month)) notFound()

  const [year, mon] = params.month.split('-').map(Number)
  const periodStart = `${params.month}-01`
  // Last day of month
  const lastDay = new Date(year, mon, 0).getDate()
  const periodEnd = `${params.month}-${String(lastDay).padStart(2, '0')}`

  const supabase = createClient()
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('transaction_date', periodStart)
    .lte('transaction_date', periodEnd)
    .eq('is_income', false)
    .not('notes', 'is', null)
    .ilike('notes', '%[flight:%')
    .order('transaction_date', { ascending: true })

  if (error) throw error
  if (!transactions || transactions.length === 0) notFound()

  // Group by flight number, preserving order
  const flightMap: Record<string, {
    flightNumber: string
    minDate: string
    maxDate: string
    allLines: typeof transactions
  }> = {}

  for (const t of transactions) {
    const fn = parseFlightNumber(t.notes)
    if (!fn) continue
    if (!flightMap[fn]) {
      flightMap[fn] = { flightNumber: fn, minDate: t.transaction_date, maxDate: t.transaction_date, allLines: [] }
    }
    flightMap[fn].allLines.push(t)
    if (t.transaction_date < flightMap[fn].minDate) flightMap[fn].minDate = t.transaction_date
    if (t.transaction_date > flightMap[fn].maxDate) flightMap[fn].maxDate = t.transaction_date
  }

  const flightGroups = Object.values(flightMap)
    .sort((a, b) => a.minDate.localeCompare(b.minDate))
    .map(fg => {
      const toLine = (t: (typeof transactions)[0]) => ({
        id: t.id,
        date: t.transaction_date,
        description: t.description || '',
        category: categoryLabels[t.category] || t.category,
        notes: t.notes?.replace(/\[flight:\w+\]\s*/, '') || '',
        amount: Math.abs(t.amount),
      })

      const dateRange = fg.minDate === fg.maxDate
        ? fmtShort(fg.minDate)
        : `${fmtShort(fg.minDate)} – ${fmtShort(fg.maxDate)}`

      return {
        flightNumber: fg.flightNumber,
        dateRange,
        invoiceALines: fg.allLines.filter(t => INVOICE_A_CATEGORIES.includes(t.category)).map(toLine),
        invoiceBLines: fg.allLines.filter(t => INVOICE_B_CATEGORIES.includes(t.category)).map(toLine),
      }
    })

  const data = {
    month: params.month,
    monthLabel: monthLabel(params.month),
    periodStart,
    periodEnd,
    flightGroups,
    generatedAt: new Date().toISOString(),
  }

  return <PrintableMonthlyInvoice data={data} />
}
