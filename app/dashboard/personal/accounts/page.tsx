import { createClient } from '@/lib/supabase/server'
import { AddAccountForm } from '@/components/personal/AddAccountForm'
import { UpdateBalanceForm } from '@/components/personal/UpdateBalanceForm'

// ─── Display groups ────────────────────────────────────────────────────────────
const DISPLAY_GROUPS = {
  bank: { types: ['checking', 'savings'], label: 'BANK', color: 'blue' as const },
  investments: { types: ['investment'], label: 'INVESTMENTS', color: 'emerald' as const },
  private_investments: { types: ['private_investment'], label: 'PRIVATE INVESTMENTS', color: 'violet' as const },
  personal_assets: { types: ['property', 'vehicle', 'other'], label: 'PERSONAL ASSETS', color: 'amber' as const },
  liabilities: { types: ['credit_card', 'mortgage', 'loan'], label: 'LIABILITIES', color: 'red' as const },
} as const

type GroupKey = keyof typeof DISPLAY_GROUPS
type GroupColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'red'

const ASSET_GROUPS: GroupKey[] = ['bank', 'investments', 'private_investments', 'personal_assets']
const LIABILITY_GROUPS: GroupKey[] = ['liabilities']

const COLOR_CLASSES: Record<GroupColor, { border: string; text: string; bg: string }> = {
  blue:    { border: 'border-blue-600',    text: 'text-blue-400',    bg: 'bg-blue-900/20' },
  emerald: { border: 'border-emerald-600', text: 'text-emerald-400', bg: 'bg-emerald-900/20' },
  violet:  { border: 'border-violet-600',  text: 'text-violet-400',  bg: 'bg-violet-900/20' },
  amber:   { border: 'border-amber-600',   text: 'text-amber-400',   bg: 'bg-amber-900/20' },
  red:     { border: 'border-red-600',     text: 'text-red-400',     bg: 'bg-red-900/20' },
}

const OWNER_LABELS: Record<string, string> = {
  scott: 'Scott',
  wife:  'Wife',
  joint: 'Joint',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number, parens = false): string {
  const abs = Math.abs(n)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return parens ? `($${formatted})` : `$${formatted}`
}

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function PersonalAccountsPage() {
  const supabase = createClient()
  const { data: accounts } = await supabase
    .from('personal_accounts')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  const allAccounts = accounts || []

  // Group accounts by display group
  const grouped: Record<GroupKey, typeof allAccounts> = {
    bank: [],
    investments: [],
    private_investments: [],
    personal_assets: [],
    liabilities: [],
  }

  for (const acct of allAccounts) {
    for (const [key, group] of Object.entries(DISPLAY_GROUPS) as [GroupKey, typeof DISPLAY_GROUPS[GroupKey]][]) {
      if ((group.types as readonly string[]).includes(acct.account_type)) {
        grouped[key].push(acct)
        break
      }
    }
  }

  // Totals
  const assetSubtotals: Record<string, number> = {}
  for (const key of ASSET_GROUPS) {
    assetSubtotals[key] = grouped[key].reduce((s, a) => s + (a.balance || 0), 0)
  }
  const totalAssets = Object.values(assetSubtotals).reduce((s, v) => s + v, 0)

  const totalLiabilities = grouped.liabilities.reduce((s, a) => s + Math.abs(a.balance || 0), 0)
  const netWorth = totalAssets - totalLiabilities

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-widest uppercase">
            Personal Balance Sheet
          </h1>
          <p className="text-xs text-muted-foreground mt-1">As of {todayFormatted()}</p>
        </div>
        <AddAccountForm />
      </div>

      {/* ── ASSETS ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Assets</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {ASSET_GROUPS.filter(key => grouped[key].length > 0).map(key => {
          const group = DISPLAY_GROUPS[key]
          const colors = COLOR_CLASSES[group.color]
          const accts = grouped[key]
          const subtotal = assetSubtotals[key]

          return (
            <div key={key} className="mb-5">
              {/* Sub-section header */}
              <div className={`flex items-center gap-2 mb-1 pl-3 border-l-2 ${colors.border}`}>
                <span className={`text-[11px] font-bold tracking-[0.15em] uppercase ${colors.text}`}>
                  {group.label}
                </span>
              </div>

              {/* Account rows */}
              {accts.map(acct => (
                <div
                  key={acct.id}
                  className="flex items-center pl-6 pr-2 py-1.5 hover:bg-muted/10 transition-colors group"
                >
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground truncate">
                      {acct.institution ? `${acct.institution} — ` : ''}{acct.name}
                    </span>
                    {acct.owner && (
                      <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded shrink-0">
                        {OWNER_LABELS[acct.owner] || acct.owner}
                      </span>
                    )}
                    {acct.last_four && (
                      <span className="text-[10px] text-muted-foreground shrink-0">···{acct.last_four}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-foreground tabular-nums font-medium w-36 text-right">
                      {fmtMoney(acct.balance || 0)}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <UpdateBalanceForm accountId={acct.id} currentBalance={acct.balance} />
                    </span>
                  </div>
                </div>
              ))}

              {/* Subtotal row */}
              <div className="flex items-center pl-6 pr-2 py-1 border-t border-border/40 mt-1">
                <span className="flex-1 text-xs text-muted-foreground italic">
                  Subtotal — {group.label}
                </span>
                <span className={`text-sm font-semibold tabular-nums w-36 text-right ${colors.text}`}>
                  {fmtMoney(subtotal)}
                </span>
                <span className="w-6" /> {/* spacer for edit button column */}
              </div>
            </div>
          )
        })}

        {/* Total Assets */}
        <div className="flex items-center pl-3 pr-2 py-2.5 border-t border-border mt-2">
          <span className="flex-1 text-sm font-bold uppercase tracking-wider text-foreground">
            Total Assets
          </span>
          <span className="text-base font-bold text-emerald-400 tabular-nums w-36 text-right">
            {fmtMoney(totalAssets)}
          </span>
          <span className="w-6" />
        </div>
      </div>

      {/* ── LIABILITIES ── */}
      {grouped.liabilities.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">Liabilities</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {grouped.liabilities.map(acct => (
            <div
              key={acct.id}
              className="flex items-center pl-6 pr-2 py-1.5 hover:bg-muted/10 transition-colors group"
            >
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-sm text-foreground truncate">
                  {acct.institution ? `${acct.institution} — ` : ''}{acct.name}
                </span>
                {acct.owner && (
                  <span className="text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded shrink-0">
                    {OWNER_LABELS[acct.owner] || acct.owner}
                  </span>
                )}
                {acct.last_four && (
                  <span className="text-[10px] text-muted-foreground shrink-0">···{acct.last_four}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-red-400 tabular-nums font-medium w-36 text-right">
                  {fmtMoney(acct.balance || 0, true)}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <UpdateBalanceForm accountId={acct.id} currentBalance={acct.balance} />
                </span>
              </div>
            </div>
          ))}

          {/* Total Liabilities */}
          <div className="flex items-center pl-3 pr-2 py-2.5 border-t border-border mt-2">
            <span className="flex-1 text-sm font-bold uppercase tracking-wider text-foreground">
              Total Liabilities
            </span>
            <span className="text-base font-bold text-red-400 tabular-nums w-36 text-right">
              {fmtMoney(totalLiabilities, true)}
            </span>
            <span className="w-6" />
          </div>
        </div>
      )}

      {/* ── NET WORTH ── */}
      <div className="border-t-2 border-border mt-4 pt-4 pb-4 border-b-2">
        <div className="flex items-center pl-3 pr-2">
          <span className="flex-1 text-base font-bold uppercase tracking-widest text-foreground">
            Net Worth
          </span>
          <span
            className={`text-2xl font-bold tabular-nums w-36 text-right ${
              netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {netWorth < 0 ? fmtMoney(netWorth, true) : fmtMoney(netWorth)}
          </span>
          <span className="w-6" />
        </div>
      </div>

    </div>
  )
}
