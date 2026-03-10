import { createClient } from '@/lib/supabase/server'
import { formatDate, getAircraftStatusColor, getAircraftStatusLabel, getMaintenanceStatusColor, getSquawkStatusColor, formatCurrency } from '@/lib/utils'
import { Plane, Wrench, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import Link from 'next/link'
import { AddMaintenanceForm } from '@/components/fleet/AddMaintenanceForm'
import { AddSquawkForm } from '@/components/fleet/AddSquawkForm'

export default async function FleetPage() {
  const supabase = createClient()

  const [
    { data: aircraft },
    { data: maintenance },
    { data: squawks },
  ] = await Promise.all([
    supabase.from('aircraft').select('*').order('name'),
    supabase
      .from('maintenance_items')
      .select('*, aircraft(name, registration)')
      .in('status', ['upcoming', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(20),
    supabase
      .from('squawks')
      .select('*, aircraft(name, registration)')
      .neq('status', 'resolved')
      .order('reported_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fleet & Maintenance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{aircraft?.length || 0} aircraft in fleet</p>
        </div>
      </div>

      {/* Aircraft Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {aircraft?.map(ac => (
          <Link
            key={ac.id}
            href={`/dashboard/fleet/${ac.id}`}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <span className={`badge-status ${getAircraftStatusColor(ac.status)}`}>
                {getAircraftStatusLabel(ac.status)}
              </span>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{ac.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{ac.registration} · {ac.make} {ac.model}</p>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Airframe</p>
                <p className="text-sm font-semibold text-foreground">{ac.airframe_hours.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">hrs</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Engine</p>
                <p className="text-sm font-semibold text-foreground">{ac.engine1_hours.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">hrs</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Cycles</p>
                <p className="text-sm font-semibold text-foreground">{ac.total_cycles}</p>
                <p className="text-xs text-muted-foreground">ldgs</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Based at <span className="text-foreground font-medium">{ac.base_icao}</span></p>
              {ac.annual_due && (
                <p className="text-xs text-muted-foreground">Annual due <span className="text-foreground font-medium">{formatDate(ac.annual_due)}</span></p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Maintenance Schedule */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="section-header flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Maintenance Schedule
            </h2>
            {aircraft && aircraft.length > 0 && (
              <AddMaintenanceForm aircraft={aircraft} />
            )}
          </div>
          <div className="divide-y divide-border">
            {maintenance?.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <span className={`badge-status text-xs ${getMaintenanceStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(item.aircraft as any)?.name} · {item.maintenance_type}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {item.due_date && <span>Due {formatDate(item.due_date)}</span>}
                    {item.due_hours && <span>{item.due_hours}hrs</span>}
                    {item.estimated_cost && <span>{formatCurrency(item.estimated_cost)}</span>}
                  </div>
                </div>
                {item.status === 'overdue' && (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                )}
              </div>
            ))}
            {(!maintenance || maintenance.length === 0) && (
              <div className="px-5 py-8 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <p className="text-muted-foreground text-sm">All maintenance up to date</p>
              </div>
            )}
          </div>
        </div>

        {/* Squawk Log */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="section-header flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Open Squawks
            </h2>
            {aircraft && aircraft.length > 0 && (
              <AddSquawkForm aircraft={aircraft} />
            )}
          </div>
          <div className="divide-y divide-border">
            {squawks?.map(squawk => (
              <div key={squawk.id} className="flex items-start gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{squawk.title}</p>
                    <span className={`badge-status text-xs ${getSquawkStatusColor(squawk.status)}`}>
                      {squawk.status}
                    </span>
                    {squawk.grounding && (
                      <span className="badge-status text-xs bg-red-900 text-red-200">GROUNDING</span>
                    )}
                    {squawk.is_mel && (
                      <span className="badge-status text-xs bg-amber-900 text-amber-200">MEL</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(squawk.aircraft as any)?.name} · Reported {formatDate(squawk.reported_at)}
                  </p>
                  {squawk.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{squawk.description}</p>
                  )}
                </div>
              </div>
            ))}
            {(!squawks || squawks.length === 0) && (
              <div className="px-5 py-8 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <p className="text-muted-foreground text-sm">No open squawks</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
