import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { BudgetSetForm } from '@/components/personal/BudgetSetForm'
import { TrendingDown, AlertTriangle } from 'lucide-react'

interface SearchParams {
  year?: string
  month?: string
  view?: string
}

export default async function PersonalBudgetPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const now = new Date()
  const year = parseInt(searchParams.year || String(now.getFullYear()))
  const month = parseInt(searchParams.month || String(now.getMonth() + 1))
  const isYTD = searchParams.view === 'ytd'

  // Monthly spending
  const fromDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  const toDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  const ytdFrom = `${year}-01-01`
  const ytdTo = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

  const queryFrom = isYTD ? ytdFrom : fromDate
  const queryTo = isYTD ? ytdTo : toDate

  const [{ data: transactions }, { data: budgets }] = await Promise.all([
    supabase
      .from('personal_transactions')
      .select('category, subcategory, amount, is_income')
      .gte('transaction_date', queryFrom)
      .lte('transaction_date', queryTo)
      .eq('is_income', false),
    supabase
      .from('personal_budgets')
      .select('*')
      .eq('period', 'monthly')
      .eq('year', year)
      .eq('month', month),
  ])

  // Aggregate spending
  const spendByKey: Record<string, number> = {}
  transactions?.forEach(t => {
    const key = t.subcategory ? `${t.category}|||${t.subcategory}` : t.category
    spendByKey[key] = (spendByKey[key] || 0) + Math.abs(t.amount)
    // Also accumulate to parent category
    spendByKey[t.category] = (spendByKey[t.category] || 0) + Math.abs(t.amount)
  })

  // Merge budgets with spending
  const rows = (budgets || []).map(b => {
    const key = b.subcategory ? `${b.category}|||${b.subcategory}` : b.category
    const spent = spendByKey[key] || 0
    const pct = b.budgeted_amount > 0 ? (spent / b.budgeted_amount) * 100 : 0
    return { ...b, spent, pct, over: spent > b.budgeted_amount, remaining: b.budgeted_amount - spent }
  }).sort((a, b) => b.pct - a.pct)

  // Unbudgeted spending
  const budgetedKeys = new Set(rows.map(r => r.subcategory ? `${r.category}|||${r.subcategory}` : r.category))
  const unbudgetedSpend: Record<string, number> = {}
  transactions?.forEach(t => {
    const key = t.subcategory ? `${t.category}|||${t.subcategory}` : t.category
    if (!budgetedKeys.has(key) && !budgetedKeys.has(t.category)) {
      unbudgetedSpend[t.category] = (unbudgetedSpend[t.category] || 0) + Math.abs(t.amount)
    }
  })

  const totalBudgeted = rows.reduce((s, r) => s + r.budgeted_amount, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const overBudgetCount = rows.filter(r => r.over).length

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  // Month navigation
  const prevMonth = month === 1 ? `?year=${year - 1}&month=12` : `?year=${year}&month=${month - 1}`
  const nextMonth = month === 12 ? `?year=${year + 1}&month=1` : `?year=${year}&month=${month + 1}`

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{isYTD ? `YTD through ${monthName}` : monthName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <a href={`${prevMonth}${isYTD ? '&view=ytd' : ''}`} className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">‹</a>
            <span className="px-3 py-1.5 text-sm text-foreground border-x border-border">{monthName}</span>
            <a href={`${nextMonth}${isYTD ? '&view=ytd' : ''}`} className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">›</a>
          </div>
          <a
            href={isYTD ? `?year=${year}&month=${month}` : `?year=${year}&month=${month}&view=ytd`}
            className="btn-secondary"
          >
            {isYTD ? 'Monthly View' : 'YTD View'}
          </a>
          <BudgetSetForm year={year} month={month} existingBudgets={budgets || []} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-primary/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Budgeted</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(totalBudgeted)}</p>
        </div>
        <div className={`stat-card ${totalSpent > totalBudgeted ? 'border-red-800/30' : 'border-emerald-800/30'}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Spent</p>
          <p className={`text-xl font-bold ${totalSpent > totalBudgeted ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className={`stat-card ${overBudgetCount > 0 ? 'border-red-800/30' : 'border-emerald-800/30'}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Over Budget</p>
          <p className={`text-xl font-bold ${overBudgetCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <TrendingDown className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Budgets Set</h3>
          <p className="text-muted-foreground text-sm mb-4">Set monthly targets to track spending against goals.</p>
          <BudgetSetForm year={year} month={month} existingBudgets={[]} />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="section-header text-base">Category Progress</h2>
          </div>
          <div className="divide-y divide-border">
            {rows.map(r => (
              <div key={`${r.category}-${r.subcategory}`} className={`px-5 py-4 ${r.over ? 'bg-red-900/10' : ''}`}>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {r.category}{r.subcategory ? ` · ${r.subcategory}` : ''}
                      </p>
                      {r.over && (
                        <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/30 border border-red-800/30 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Over {formatCurrency(r.spent - r.budgeted_amount)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(r.spent)} of {formatCurrency(r.budgeted_amount)}
                      {!r.over && <span className="ml-2 text-emerald-400">{formatCurrency(r.remaining)} remaining</span>}
                    </p>
                  </div>
                  <p className={`text-lg font-bold shrink-0 ${r.over ? 'text-red-400' : r.pct > 80 ? 'text-amber-400' : 'text-foreground'}`}>
                    {Math.round(r.pct)}%
                  </p>
                </div>
                <div className="w-full h-2.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${r.over ? 'bg-red-500' : r.pct > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(r.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unbudgeted spending */}
      {Object.keys(unbudgetedSpend).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="section-header text-base mb-3">Unbudgeted Spending</h2>
          <p className="text-xs text-muted-foreground mb-3">These categories have spending but no budget set.</p>
          <div className="space-y-2">
            {Object.entries(unbudgetedSpend).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{cat}</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
