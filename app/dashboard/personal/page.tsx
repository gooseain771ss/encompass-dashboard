import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
  TrendingUp, TrendingDown, DollarSign, Wallet,
  CreditCard, ArrowRight, AlertCircle
} from 'lucide-react'
import Link from 'next/link'

export default async function PersonalOverviewPage() {
  const supabase = createClient()
  const now = new Date()
  const fromDate = format(startOfMonth(now), 'yyyy-MM-dd')
  const toDate = format(endOfMonth(now), 'yyyy-MM-dd')

  const [
    { data: transactions },
    { data: accounts },
    { data: budgets },
    { data: latestSnapshot },
    { count: reviewCount },
  ] = await Promise.all([
    supabase
      .from('personal_transactions')
      .select('*, personal_accounts(name)')
      .gte('transaction_date', fromDate)
      .lte('transaction_date', toDate)
      .order('transaction_date', { ascending: false })
      .limit(200),
    supabase
      .from('personal_accounts')
      .select('*')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('personal_budgets')
      .select('*')
      .eq('period', 'monthly')
      .eq('year', now.getFullYear())
      .eq('month', now.getMonth() + 1),
    supabase
      .from('personal_net_worth_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('personal_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('needs_review', true),
  ])

  const income = transactions?.filter(t => t.is_income).reduce((s, t) => s + t.amount, 0) || 0
  const expenses = transactions?.filter(t => !t.is_income).reduce((s, t) => s + Math.abs(t.amount), 0) || 0
  const net = income - expenses

  // Compute live net worth from accounts
  const totalAssets = accounts?.filter(a => a.is_asset).reduce((s, a) => s + (a.balance || 0), 0) || 0
  const totalLiabilities = accounts?.filter(a => a.is_liability).reduce((s, a) => s + Math.abs(a.balance || 0), 0) || 0
  const netWorth = totalAssets - totalLiabilities

  // Budget progress
  const categorySpend: Record<string, number> = {}
  transactions?.filter(t => !t.is_income).forEach(t => {
    categorySpend[t.category] = (categorySpend[t.category] || 0) + Math.abs(t.amount)
  })

  const budgetProgress = (budgets || []).map(b => ({
    ...b,
    spent: categorySpend[b.category] || 0,
    pct: b.budgeted_amount > 0 ? Math.min(((categorySpend[b.category] || 0) / b.budgeted_amount) * 100, 100) : 0,
    over: (categorySpend[b.category] || 0) > b.budgeted_amount,
  })).sort((a, b) => b.pct - a.pct).slice(0, 6)

  const recentTxns = transactions?.slice(0, 10) || []

  const monthLabel = format(now, 'MMMM yyyy')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Personal Finance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{monthLabel} · Scott Nussbaum Household</p>
        </div>
        {(reviewCount ?? 0) > 0 && (
          <Link href="/dashboard/personal/transactions?review=1" className="flex items-center gap-2 text-amber-400 bg-amber-900/20 border border-amber-800/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-900/30 transition-colors">
            <AlertCircle className="w-4 h-4" />
            {reviewCount} transactions need review
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card border-emerald-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Income</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(income)}</p>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>

        <div className="stat-card border-red-800/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expenses</p>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(expenses)}</p>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>

        <div className={`stat-card ${net >= 0 ? 'border-primary/30' : 'border-red-800/30'}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net This Month</p>
            <DollarSign className={`w-4 h-4 ${net >= 0 ? 'text-primary' : 'text-red-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${net >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {net < 0 ? '-' : ''}{formatCurrency(Math.abs(net))}
          </p>
          <p className={`text-xs ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {net >= 0 ? 'Surplus' : 'Deficit'}
          </p>
        </div>

        <div className="stat-card border-primary/30">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Worth</p>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(netWorth)}</p>
          <p className="text-xs text-muted-foreground">
            {latestSnapshot ? `Snapshot: ${formatDate(latestSnapshot.snapshot_date)}` : 'Live from accounts'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Budget Progress */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header">Budget Progress</h2>
            <Link href="/dashboard/personal/budget" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {budgetProgress.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">No budgets set yet.</p>
              <Link href="/dashboard/personal/budget" className="btn-secondary text-sm">Set Budgets</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetProgress.map(b => (
                <div key={`${b.category}${b.subcategory}`}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">
                      {b.category}{b.subcategory ? ` · ${b.subcategory}` : ''}
                    </span>
                    <span className={`font-medium ${b.over ? 'text-red-400' : 'text-foreground'}`}>
                      {formatCurrency(b.spent)} / {formatCurrency(b.budgeted_amount)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${b.over ? 'bg-red-500' : b.pct > 80 ? 'bg-amber-500' : 'bg-primary'}`}
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-0.5 ${b.over ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {b.over ? `Over by ${formatCurrency(b.spent - b.budgeted_amount)}` : `${Math.round(b.pct)}% used`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="section-header">Recent Transactions</h2>
            <Link href="/dashboard/personal/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentTxns.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                No transactions this month yet.{' '}
                <Link href="/dashboard/personal/transactions" className="text-primary hover:underline">Add one</Link>
              </div>
            ) : (
              recentTxns.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${t.is_income ? 'bg-emerald-900/40' : 'bg-red-900/40'}`}>
                    {t.is_income
                      ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                      : <CreditCard className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.category}{t.subcategory ? ` · ${t.subcategory}` : ''} · {formatDate(t.transaction_date)}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold shrink-0 ${t.is_income ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.is_income ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/dashboard/personal/transactions', label: 'Transactions', icon: CreditCard },
          { href: '/dashboard/personal/budget', label: 'Budget', icon: TrendingDown },
          { href: '/dashboard/personal/accounts', label: 'Accounts', icon: Wallet },
          { href: '/dashboard/personal/networth', label: 'Net Worth', icon: TrendingUp },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/40 hover:bg-muted/20 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{label}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  )
}
