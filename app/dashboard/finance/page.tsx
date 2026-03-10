import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, TrendingUp, TrendingDown, Upload, Plus, Download } from 'lucide-react'
import { AddTransactionForm } from '@/components/finance/AddTransactionForm'
import { ReceiptUpload } from '@/components/finance/ReceiptUpload'
import { ExportCSV } from '@/components/finance/ExportCSV'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface SearchParams {
  from?: string
  to?: string
  category?: string
  aircraft?: string
}

export default async function FinancePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()

  const fromDate = searchParams.from || format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const toDate = searchParams.to || format(endOfMonth(new Date()), 'yyyy-MM-dd')

  let query = supabase
    .from('transactions')
    .select('*, aircraft(name, registration), quote(quote_number, origin_icao, destination_icao)')
    .gte('transaction_date', fromDate)
    .lte('transaction_date', toDate)
    .order('transaction_date', { ascending: false })

  if (searchParams.category) {
    query = query.eq('category', searchParams.category)
  }
  if (searchParams.aircraft) {
    query = query.eq('aircraft_id', searchParams.aircraft)
  }

  const [{ data: transactions }, { data: aircraft }] = await Promise.all([
    query.limit(200),
    supabase.from('aircraft').select('id, name').order('name'),
  ])

  // Calculate P&L
  const income = transactions?.filter(t => t.is_income).reduce((s, t) => s + t.amount, 0) || 0
  const expenses = transactions?.filter(t => !t.is_income).reduce((s, t) => s + Math.abs(t.amount), 0) || 0
  const profit = income - expenses

  // Category breakdown
  const categoryTotals: Record<string, number> = {}
  transactions?.filter(t => !t.is_income).forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.amount)
  })
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  const categoryLabels: Record<string, string> = {
    fuel: 'Fuel', maintenance: 'Maintenance', crew: 'Crew', landing_fees: 'Landing Fees',
    catering: 'Catering', insurance: 'Insurance', hangar: 'Hangar', navigation: 'Navigation',
    ground_transport: 'Ground Transport', other: 'Other',
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(new Date(fromDate), 'MMM d')} – {format(new Date(toDate), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportCSV transactions={transactions || []} fromDate={fromDate} toDate={toDate} />
          <AddTransactionForm aircraft={aircraft || []} />
        </div>
      </div>

      {/* Date Range Filter */}
      <form className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="form-label mb-1.5 block">From</label>
          <input type="date" name="from" defaultValue={fromDate} className="input-base" />
        </div>
        <div>
          <label className="form-label mb-1.5 block">To</label>
          <input type="date" name="to" defaultValue={toDate} className="input-base" />
        </div>
        <div>
          <label className="form-label mb-1.5 block">Category</label>
          <select name="category" defaultValue={searchParams.category || ''} className="input-base">
            <option value="">All Categories</option>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label mb-1.5 block">Aircraft</label>
          <select name="aircraft" defaultValue={searchParams.aircraft || ''} className="input-base">
            <option value="">All Aircraft</option>
            {aircraft?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-secondary">Apply</button>
        <a href="/dashboard/finance" className="btn-ghost">Reset</a>
      </form>

      {/* P&L Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card border-emerald-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenue</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(income)}</p>
          <p className="text-xs text-muted-foreground">{transactions?.filter(t => t.is_income).length} transactions</p>
        </div>

        <div className="stat-card border-red-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expenses</p>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(expenses)}</p>
          <p className="text-xs text-muted-foreground">{transactions?.filter(t => !t.is_income).length} transactions</p>
        </div>

        <div className={`stat-card ${profit >= 0 ? 'border-primary/30' : 'border-red-800/30'}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Profit</p>
            <DollarSign className={`w-4 h-4 ${profit >= 0 ? 'text-primary' : 'text-red-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {formatCurrency(Math.abs(profit))}
          </p>
          <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profit >= 0 ? 'Profit' : 'Loss'} · {income > 0 ? Math.round((profit / income) * 100) : 0}% margin
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="section-header mb-4">Expense Breakdown</h2>
          <div className="space-y-3">
            {sortedCategories.slice(0, 8).map(([cat, amount]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{categoryLabels[cat] || cat}</span>
                  <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
                </div>
                <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: expenses > 0 ? `${(amount / expenses) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
            {sortedCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses in period</p>
            )}
          </div>
        </div>

        {/* Transaction List */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="section-header">Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Description</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Aircraft</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions?.map(t => (
                  <tr key={t.id} className="table-row-hover">
                    <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(t.transaction_date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm text-foreground">{t.description}</p>
                      {t.receipt_url && (
                        <a href={t.receipt_url} target="_blank" className="text-xs text-primary hover:underline">View receipt</a>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded capitalize">
                        {categoryLabels[t.category] || t.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">
                      {(t.aircraft as any)?.name || '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-right text-sm font-semibold ${t.is_income ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.is_income ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                    </td>
                  </tr>
                ))}
                {(!transactions || transactions.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No transactions in this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
