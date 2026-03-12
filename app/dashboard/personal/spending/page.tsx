import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/components/personal/categories'

interface SearchParams {
  from?: string
  to?: string
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function formatPeriodLabel(from: string, to: string): string {
  const f = new Date(from + 'T12:00:00')
  const t = new Date(to + 'T12:00:00')
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return `${fmt(f)} – ${fmt(t)}`
}

export default async function SpendingSummaryPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const now = new Date()
  const fromDate = searchParams.from || format(startOfMonth(now), 'yyyy-MM-dd')
  const toDate = searchParams.to || format(endOfMonth(now), 'yyyy-MM-dd')

  const { data: rawTransactions } = await supabase
    .from('personal_transactions')
    .select('category, subcategory, amount, is_income')
    .gte('transaction_date', fromDate)
    .lte('transaction_date', toDate)
    .eq('needs_review', false)

  const transactions = rawTransactions || []

  // ─── Group by category → subcategory ──────────────────────────────────────
  const expenseMap = new Map<string, { total: number; subs: Map<string, number> }>()
  const incomeMap = new Map<string, number>()

  let totalIncome = 0
  let totalExpenses = 0

  for (const t of transactions) {
    const amt = Math.abs(t.amount)
    if (t.is_income) {
      totalIncome += amt
      incomeMap.set(t.category, (incomeMap.get(t.category) || 0) + amt)
    } else {
      totalExpenses += amt
      const catEntry = expenseMap.get(t.category) || { total: 0, subs: new Map<string, number>() }
      catEntry.total += amt
      if (t.subcategory) {
        catEntry.subs.set(t.subcategory, (catEntry.subs.get(t.subcategory) || 0) + amt)
      }
      expenseMap.set(t.category, catEntry)
    }
  }

  const net = totalIncome - totalExpenses

  // Sort expense categories by total desc
  const sortedExpenseCategories = Array.from(expenseMap.entries())
    .sort((a, b) => b[1].total - a[1].total)

  // Sort income categories
  const sortedIncomeCategories = Array.from(incomeMap.entries())
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/personal/transactions"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transactions
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Spending Summary</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{formatPeriodLabel(fromDate, toDate)}</p>
          </div>

          {/* Date range form */}
          <form className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="form-label mb-1.5 block text-xs">From</label>
              <input type="date" name="from" defaultValue={fromDate} className="input-base text-sm" />
            </div>
            <div>
              <label className="form-label mb-1.5 block text-xs">To</label>
              <input type="date" name="to" defaultValue={toDate} className="input-base text-sm" />
            </div>
            <button type="submit" className="btn-secondary text-sm">Apply</button>
            <a href="/dashboard/personal/spending" className="btn-ghost text-sm">Reset</a>
          </form>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card border-emerald-800/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Income</p>
          <p className="text-xl font-bold text-emerald-400 tabular-nums">{fmtMoney(totalIncome)}</p>
        </div>
        <div className="stat-card border-red-800/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Expenses</p>
          <p className="text-xl font-bold text-red-400 tabular-nums">{fmtMoney(totalExpenses)}</p>
        </div>
        <div className={`stat-card ${net >= 0 ? 'border-primary/30' : 'border-red-800/30'}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net</p>
          <p className={`text-xl font-bold tabular-nums ${net >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {fmtMoney(net)}
          </p>
        </div>
      </div>

      {/* Expense breakdown */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="section-header text-base">Expense Breakdown</h2>
        </div>

        {sortedExpenseCategories.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            No expense transactions for this period.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20">% Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sortedExpenseCategories.map(([cat, { total, subs }]) => {
                const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
                const sortedSubs = Array.from(subs.entries()).sort((a, b) => b[1] - a[1])

                return (
                  <>
                    {/* Category row */}
                    <tr key={cat} className="border-l-2 border-l-primary bg-muted/5 hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-sm font-semibold text-foreground uppercase tracking-wide">{cat}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-bold text-foreground tabular-nums">{fmtMoney(total)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                      </td>
                    </tr>

                    {/* Subcategory rows */}
                    {sortedSubs.map(([sub, subTotal]) => {
                      const subPct = totalExpenses > 0 ? (subTotal / totalExpenses) * 100 : 0
                      return (
                        <tr key={`${cat}-${sub}`} className="hover:bg-muted/5 transition-colors">
                          <td className="px-5 py-2">
                            <span className="text-sm text-muted-foreground pl-6">{sub}</span>
                          </td>
                          <td className="px-5 py-2 text-right">
                            <span className="text-sm text-foreground/80 tabular-nums">{fmtMoney(subTotal)}</span>
                          </td>
                          <td className="px-5 py-2 text-right">
                            <span className="text-xs text-muted-foreground/60 tabular-nums">{subPct.toFixed(1)}%</span>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}

              {/* Total row */}
              <tr className="border-t-2 border-border bg-muted/10">
                <td className="px-5 py-3 text-sm font-bold text-foreground">TOTAL EXPENSES</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-red-400 tabular-nums">{fmtMoney(totalExpenses)}</td>
                <td className="px-5 py-3 text-right text-xs text-muted-foreground">100%</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Income section */}
      {sortedIncomeCategories.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="section-header text-base">Income</h2>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-border/50">
              {sortedIncomeCategories.map(([cat, total]) => (
                <tr key={cat} className="hover:bg-muted/5 transition-colors">
                  <td className="px-5 py-3 text-sm text-foreground">{cat}</td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-emerald-400 tabular-nums">{fmtMoney(total)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/10">
                <td className="px-5 py-3 text-sm font-bold text-foreground">TOTAL INCOME</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-emerald-400 tabular-nums">{fmtMoney(totalIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
