import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { AlertCircle, CreditCard, TrendingUp } from 'lucide-react'
import { AddPersonalTransactionForm } from '@/components/personal/AddPersonalTransactionForm'
import { CSVImport } from '@/components/personal/CSVImport'
import { AmazonImport } from '@/components/personal/AmazonImport'
import Link from 'next/link'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/components/personal/categories'

interface SearchParams {
  from?: string
  to?: string
  category?: string
  account?: string
  type?: string
  review?: string
}

export default async function PersonalTransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const now = new Date()
  const fromDate = searchParams.from || format(startOfMonth(now), 'yyyy-MM-dd')
  const toDate = searchParams.to || format(endOfMonth(now), 'yyyy-MM-dd')

  let query = supabase
    .from('personal_transactions')
    .select('*, personal_accounts(name, institution)')
    .gte('transaction_date', fromDate)
    .lte('transaction_date', toDate)
    .order('transaction_date', { ascending: false })

  if (searchParams.category) query = query.eq('category', searchParams.category)
  if (searchParams.account) query = query.eq('account_id', searchParams.account)
  if (searchParams.type === 'income') query = query.eq('is_income', true)
  if (searchParams.type === 'expense') query = query.eq('is_income', false)
  if (searchParams.review === '1') query = query.eq('needs_review', true)

  const [{ data: transactions }, { data: accounts }, { count: reviewCount }] = await Promise.all([
    query.limit(500),
    supabase.from('personal_accounts').select('id, name, institution').eq('is_active', true).order('display_order'),
    supabase.from('personal_transactions').select('id', { count: 'exact', head: true }).eq('needs_review', true),
  ])

  const income = transactions?.filter(t => t.is_income).reduce((s, t) => s + t.amount, 0) || 0
  const expenses = transactions?.filter(t => !t.is_income).reduce((s, t) => s + Math.abs(t.amount), 0) || 0
  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(new Date(fromDate + 'T12:00:00'), 'MMM d')} – {format(new Date(toDate + 'T12:00:00'), 'MMM d, yyyy')}
            {(reviewCount ?? 0) > 0 && (
              <Link href="?review=1" className="ml-3 text-amber-400 hover:underline">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
                {reviewCount} need review
              </Link>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AmazonImport accounts={accounts || []} />
          <CSVImport accounts={accounts || []} />
          <AddPersonalTransactionForm accounts={accounts || []} />
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-4">
        <div>
          <label className="form-label mb-1.5 block">From</label>
          <input type="date" name="from" defaultValue={fromDate} className="input-base" />
        </div>
        <div>
          <label className="form-label mb-1.5 block">To</label>
          <input type="date" name="to" defaultValue={toDate} className="input-base" />
        </div>
        <div>
          <label className="form-label mb-1.5 block">Type</label>
          <select name="type" defaultValue={searchParams.type || ''} className="input-base">
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
          </select>
        </div>
        <div>
          <label className="form-label mb-1.5 block">Category</label>
          <select name="category" defaultValue={searchParams.category || ''} className="input-base">
            <option value="">All Categories</option>
            {allCategories.map(c => (
              <option key={c.label} value={c.label}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label mb-1.5 block">Account</label>
          <select name="account" defaultValue={searchParams.account || ''} className="input-base">
            <option value="">All Accounts</option>
            {accounts?.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">Apply</button>
        <a href="/dashboard/personal/transactions" className="btn-ghost">Reset</a>
      </form>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card border-emerald-800/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Income</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(income)}</p>
        </div>
        <div className="stat-card border-red-800/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Expenses</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(expenses)}</p>
        </div>
        <div className={`stat-card ${income - expenses >= 0 ? 'border-primary/30' : 'border-red-800/30'}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net</p>
          <p className={`text-xl font-bold ${income - expenses >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {formatCurrency(income - expenses)}
          </p>
        </div>
      </div>

      {/* Transaction table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="section-header text-base">{transactions?.length || 0} Transactions</h2>
          {searchParams.review === '1' && (
            <span className="text-xs text-amber-400 bg-amber-900/20 border border-amber-800/30 px-2 py-1 rounded">
              Showing needs-review only
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Description</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Account</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions?.map(t => (
                <tr key={t.id} className={`table-row-hover ${t.needs_review ? 'border-l-2 border-l-amber-500' : ''}`}>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(t.transaction_date)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded shrink-0 flex items-center justify-center ${t.is_income ? 'bg-emerald-900/40' : 'bg-red-900/40'}`}>
                        {t.is_income
                          ? <TrendingUp className="w-3 h-3 text-emerald-400" />
                          : <CreditCard className="w-3 h-3 text-red-400" />
                        }
                      </div>
                      <div>
                        <p className="text-sm text-foreground leading-tight">{t.description}</p>
                        {t.merchant && t.merchant !== t.description && (
                          <p className="text-xs text-muted-foreground">{t.merchant}</p>
                        )}
                        {t.needs_review && (
                          <span className="text-xs text-amber-400 flex items-center gap-0.5 mt-0.5">
                            <AlertCircle className="w-3 h-3" /> Needs review
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div>
                      <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded">
                        {t.category}
                      </span>
                      {t.subcategory && (
                        <span className="text-xs text-muted-foreground ml-1">› {t.subcategory}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-muted-foreground">
                    {(t.personal_accounts as any)?.name || '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right text-sm font-semibold whitespace-nowrap ${t.is_income ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.is_income ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
              {(!transactions || transactions.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No transactions found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
