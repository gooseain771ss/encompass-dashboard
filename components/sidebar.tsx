'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Plane,
  LayoutDashboard,
  Calendar,
  Wrench,
  DollarSign,
  Users,
  Globe,
  Mail,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  ClipboardCheck,
  BarChart2,
  BookOpen,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const businessNavItems = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/trips',
    label: 'Trips & Quotes',
    icon: Calendar,
  },
  {
    href: '/dashboard/fleet',
    label: 'Fleet & Maintenance',
    icon: Wrench,
  },
  {
    href: '/dashboard/finance',
    label: 'Finance',
    icon: DollarSign,
  },
  {
    href: '/dashboard/pilots',
    label: 'Pilots',
    icon: Users,
  },
  {
    href: '/dashboard/avinode',
    label: 'Avinode Intelligence',
    icon: Mail,
  },
  {
    href: '/dashboard/manifests',
    label: 'Manifests',
    icon: BookOpen,
  },
]

const personalNavItems = [
  {
    href: '/dashboard/personal',
    label: 'Personal Finance',
    icon: Home,
  },
  {
    href: '/dashboard/personal/spending',
    label: 'Spending',
    icon: BarChart2,
  },
]

// Keep backward-compat alias
const navItems = businessNavItems

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [reviewCount, setReviewCount] = useState<number>(0)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('personal_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('needs_review', true)
      .then(({ count }) => setReviewCount(count ?? 0))
  }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl">
          <Plane className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground leading-tight">Encompass</div>
          <div className="text-xs text-muted-foreground">Aviation</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Business section */}
        <p className="px-3 pb-1 pt-0.5 text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Business</p>
        {businessNavItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn('nav-item', active ? 'nav-item-active' : 'nav-item-inactive')}
            >
              <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : '')} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-primary/50" />}
            </Link>
          )
        })}

        {/* Personal section divider */}
        <div className="pt-3 pb-1">
          <div className="border-t border-border/50 mb-3" />
          <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">Personal</p>
        </div>
        {personalNavItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn('nav-item', active ? 'nav-item-active' : 'nav-item-inactive')}
            >
              <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : '')} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-primary/50" />}
            </Link>
          )
        })}
        {/* Review Queue with badge */}
        {(() => {
          const active = isActive('/dashboard/personal/review')
          return (
            <Link
              href="/dashboard/personal/review"
              onClick={() => setMobileOpen(false)}
              className={cn('nav-item', active ? 'nav-item-active' : 'nav-item-inactive')}
            >
              <ClipboardCheck className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : '')} />
              <span className="flex-1">Review Queue</span>
              {reviewCount > 0 && (
                <span className="text-xs bg-amber-900/50 text-amber-300 border border-amber-800/40 px-1.5 py-0.5 rounded-full leading-none">
                  {reviewCount}
                </span>
              )}
              {active && reviewCount === 0 && <ChevronRight className="w-3.5 h-3.5 text-primary/50" />}
            </Link>
          )
        })()}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <a
          href="/portal"
          target="_blank"
          className="nav-item nav-item-inactive"
        >
          <Globe className="w-4 h-4 shrink-0" />
          <span>Customer Portal</span>
        </a>
        <button
          onClick={handleSignOut}
          className="nav-item nav-item-inactive w-full text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Version */}
      <div className="px-4 pb-3">
        <p className="text-xs text-muted-foreground/50">v1.0.0 · flyencompass.com</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-card border-r border-border shrink-0 h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 bg-primary/10 border border-primary/20 rounded-lg">
            <Plane className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">Encompass Aviation</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
