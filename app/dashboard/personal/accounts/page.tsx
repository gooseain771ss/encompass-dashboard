import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { AddAccountForm } from '@/components/personal/AddAccountForm'
import { UpdateBalanceForm } from '@/components/personal/UpdateBalanceForm'
import { Wallet, CreditCard, TrendingUp, Building, Car, Home } from 'lucide-react'

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  checking: Wallet,
  savings: Wallet,
  credit_card: CreditCard,
  investment: TrendingUp,
  mortgage: Home,
  loan: Building,
  property: Home,
  vehicle: Car,
  other: Wallet,
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  investment: 'Investment',
  mortgage: 'Mortgage',
  loan: 'Loan',
  property: 'Property',
  vehicle: 'Vehicle',
  other: 'Other',
}

const OWNER_LABELS: Record<string, string> = {
  scott: 'Scott',
  wife: 'Wife',
  joint: 'Joint',
}

export default async function PersonalAccountsPage() {
  const supabase = createClient()
  const { data: accounts } = await supabase
    .from('personal_accounts')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  const assets = accounts?.filter(a => a.is_asset) || []
  const liabilities = accounts?.filter(a => a.is_liability) || []

  const totalAssets = assets.reduce((s, a) => s + (a.balance || 0), 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + Math.abs(a.balance || 0), 0)
  const netWorth = totalAssets - totalLiabilities

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Assets, liabilities & net worth</p>
        </div>
        <AddAccountForm />
      </div>

      {/* Net worth summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-emerald-800/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Assets</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAssets)}</p>
          <p className="text-xs text-muted-foreground">{assets.length} accounts</p>
        </div>
        <div className="stat-card border-red-800/30">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Liabilities</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalLiabilities)}</p>
          <p className="text-xs text-muted-foreground">{liabilities.length} accounts</p>
        </div>
        <div className={`stat-card ${netWorth >= 0 ? 'border-primary/30' : 'border-red-800/30'}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Worth</p>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {formatCurrency(netWorth)}
          </p>
          <p className="text-xs text-muted-foreground">Assets − Liabilities</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div>
          <h2 className="section-header mb-3 text-emerald-400">Assets</h2>
          {assets.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
              No assets added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map(a => {
                const Icon = ACCOUNT_TYPE_ICONS[a.account_type] || Wallet
                return (
                  <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-900/30 border border-emerald-700/30 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{a.name}</p>
                        {a.last_four && (
                          <span className="text-xs text-muted-foreground">···{a.last_four}</span>
                        )}
                        <span className="text-xs bg-muted/40 text-muted-foreground px-2 py-0.5 rounded">
                          {OWNER_LABELS[a.owner] || a.owner}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.institution && `${a.institution} · `}{ACCOUNT_TYPE_LABELS[a.account_type]}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 justify-end">
                        <p className="text-base font-bold text-emerald-400">{formatCurrency(a.balance)}</p>
                        <UpdateBalanceForm accountId={a.id} currentBalance={a.balance} />
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="px-4 py-2 flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Total Assets</span>
                <span className="text-base font-bold text-emerald-400">{formatCurrency(totalAssets)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Liabilities */}
        <div>
          <h2 className="section-header mb-3 text-red-400">Liabilities</h2>
          {liabilities.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">
              No liabilities added yet.
            </div>
          ) : (
            <div className="space-y-3">
              {liabilities.map(a => {
                const Icon = ACCOUNT_TYPE_ICONS[a.account_type] || CreditCard
                return (
                  <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-900/30 border border-red-700/30 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{a.name}</p>
                        {a.last_four && (
                          <span className="text-xs text-muted-foreground">···{a.last_four}</span>
                        )}
                        <span className="text-xs bg-muted/40 text-muted-foreground px-2 py-0.5 rounded">
                          {OWNER_LABELS[a.owner] || a.owner}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.institution && `${a.institution} · `}{ACCOUNT_TYPE_LABELS[a.account_type]}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 justify-end">
                        <p className="text-base font-bold text-red-400">{formatCurrency(a.balance)}</p>
                        <UpdateBalanceForm accountId={a.id} currentBalance={a.balance} />
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="px-4 py-2 flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Total Liabilities</span>
                <span className="text-base font-bold text-red-400">{formatCurrency(totalLiabilities)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
