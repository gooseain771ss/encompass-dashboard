import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { QuoteStatus, AircraftStatus, MaintenanceStatus, SquawkStatus, BrokerRequestStatus } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyExact(amount: number | null | undefined): string {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '0.0'
  return hours.toFixed(1)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'MMM d, yyyy')
  } catch {
    return date
  }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return format(parseISO(date), 'MMM d, yyyy h:mm a')
  } catch {
    return date
  }
}

export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true })
  } catch {
    return date
  }
}

export function getQuoteStatusColor(status: QuoteStatus): string {
  const colors: Record<QuoteStatus, string> = {
    draft: 'bg-slate-700 text-slate-200',
    sent: 'bg-blue-900 text-blue-200',
    accepted: 'bg-emerald-900 text-emerald-200',
    scheduled: 'bg-violet-900 text-violet-200',
    completed: 'bg-teal-900 text-teal-200',
    invoiced: 'bg-amber-900 text-amber-200',
    paid: 'bg-green-900 text-green-200',
    declined: 'bg-red-900 text-red-200',
    cancelled: 'bg-gray-800 text-gray-400',
  }
  return colors[status] || 'bg-gray-800 text-gray-400'
}

export function getQuoteStatusLabel(status: QuoteStatus): string {
  const labels: Record<QuoteStatus, string> = {
    draft: 'Draft Quote',
    sent: 'Sent',
    accepted: 'Accepted',
    scheduled: 'Scheduled',
    completed: 'Completed',
    invoiced: 'Invoiced',
    paid: 'Paid',
    declined: 'Declined',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

export function getAircraftStatusColor(status: AircraftStatus): string {
  const colors: Record<AircraftStatus, string> = {
    available: 'bg-emerald-900 text-emerald-200',
    in_flight: 'bg-blue-900 text-blue-200',
    maintenance: 'bg-amber-900 text-amber-200',
    aog: 'bg-red-900 text-red-200',
  }
  return colors[status] || 'bg-gray-800 text-gray-400'
}

export function getAircraftStatusLabel(status: AircraftStatus): string {
  const labels: Record<AircraftStatus, string> = {
    available: 'Available',
    in_flight: 'In Flight',
    maintenance: 'Maintenance',
    aog: 'AOG',
  }
  return labels[status] || status
}

export function getMaintenanceStatusColor(status: MaintenanceStatus): string {
  const colors: Record<MaintenanceStatus, string> = {
    upcoming: 'bg-blue-900 text-blue-200',
    overdue: 'bg-red-900 text-red-200',
    completed: 'bg-emerald-900 text-emerald-200',
    deferred: 'bg-amber-900 text-amber-200',
  }
  return colors[status] || 'bg-gray-800 text-gray-400'
}

export function getSquawkStatusColor(status: SquawkStatus): string {
  const colors: Record<SquawkStatus, string> = {
    open: 'bg-red-900 text-red-200',
    deferred: 'bg-amber-900 text-amber-200',
    resolved: 'bg-emerald-900 text-emerald-200',
  }
  return colors[status] || 'bg-gray-800 text-gray-400'
}

export function getBrokerRequestStatusColor(status: BrokerRequestStatus): string {
  const colors: Record<BrokerRequestStatus, string> = {
    pending: 'bg-amber-900 text-amber-200',
    bid_submitted: 'bg-blue-900 text-blue-200',
    won: 'bg-emerald-900 text-emerald-200',
    lost: 'bg-red-900 text-red-200',
    passed: 'bg-gray-800 text-gray-400',
  }
  return colors[status] || 'bg-gray-800 text-gray-400'
}

export function getFitScoreColor(score: number | null): string {
  if (score == null) return 'text-gray-400'
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-amber-400'
  if (score >= 4) return 'text-orange-400'
  return 'text-red-400'
}

export const QUOTE_STATUS_PIPELINE: QuoteStatus[] = [
  'draft', 'sent', 'accepted', 'scheduled', 'completed', 'invoiced', 'paid'
]

export function getNextStatus(current: QuoteStatus): QuoteStatus | null {
  const idx = QUOTE_STATUS_PIPELINE.indexOf(current)
  if (idx === -1 || idx === QUOTE_STATUS_PIPELINE.length - 1) return null
  return QUOTE_STATUS_PIPELINE[idx + 1]
}
