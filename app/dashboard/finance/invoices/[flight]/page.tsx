import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PrintableInvoice } from '@/components/invoice-print/printable-invoice'

const INVOICE_A_CATEGORIES = ['fuel']
const INVOICE_B_CATEGORIES = ['fuel_surcharge', 'fbo_fees', 'meals', 'maintenance', 'crew', 'catering', 'ground_transport', 'navigation', 'hangar', 'insurance', 'other']

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

export default async function FlightInvoicePrintPage({
  params,
  searchParams,
}: {
  params: { flight: string }
  searchParams: { billTo?: string; billToAddress?: string; type?: string }
}) {
  const supabase = createClient()
  const flightNumber = params.flight

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, aircraft(name, registration)')
    .ilike('notes', `%[flight:${flightNumber}]%`)
    .eq('is_income', false)
    .order('transaction_date', { ascending: true })

  if (!transactions || transactions.length === 0) notFound()

  const aircraft = (transactions[0].aircraft as any)?.registration || 'N771SS'
  const dates = transactions.map(t => t.transaction_date).sort()
  const tripDate = dates[0]
  const tripDateEnd = dates[dates.length - 1]

  const invoiceALines = transactions
    .filter(t => INVOICE_A_CATEGORIES.includes(t.category))
    .map(t => ({
      id: t.id,
      date: t.transaction_date,
      description: t.description,
      category: categoryLabels[t.category] || t.category,
      notes: t.notes?.replace(/\[flight:\w+\]\s*/, '') || '',
      amount: Math.abs(t.amount),
    }))

  const invoiceBLines = transactions
    .filter(t => INVOICE_B_CATEGORIES.includes(t.category))
    .map(t => ({
      id: t.id,
      date: t.transaction_date,
      description: t.description,
      category: categoryLabels[t.category] || t.category,
      notes: t.notes?.replace(/\[flight:\w+\]\s*/, '') || '',
      amount: Math.abs(t.amount),
    }))

  const invoiceData = {
    flightNumber,
    aircraft,
    tripDate,
    tripDateEnd,
    billTo: searchParams.billTo || '',
    billToAddress: searchParams.billToAddress || '',
    invoiceALines,
    invoiceBLines,
    generatedAt: new Date().toISOString(),
  }

  return <PrintableInvoice data={invoiceData} />
}
