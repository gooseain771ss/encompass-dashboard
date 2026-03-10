import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate, formatCurrency, getAircraftStatusColor, getAircraftStatusLabel, getMaintenanceStatusColor, getSquawkStatusColor } from '@/lib/utils'
import { Plane, Wrench, AlertTriangle, Clock, Activity, LogIn } from 'lucide-react'
import Link from 'next/link'
import { LogFlightForm } from '@/components/fleet/LogFlightForm'
import { UpdateAircraftStatus } from '@/components/fleet/UpdateAircraftStatus'

export default async function AircraftDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: aircraft } = await supabase
    .from('aircraft')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!aircraft) notFound()

  const [
    { data: maintenance },
    { data: squawks },
    { data: recentLogs },
    { data: pilots },
  ] = await Promise.all([
    supabase
      .from('maintenance_items')
      .select('*')
      .eq('aircraft_id', params.id)
      .order('due_date', { ascending: true })
      .limit(20),
    supabase
      .from('squawks')
      .select('*, reporter:pilots(first_name, last_name)')
      .eq('aircraft_id', params.id)
      .order('reported_at', { ascending: false })
      .limit(20),
    supabase
      .from('flight_logs')
      .select('*, pic:pilots(first_name, last_name)')
      .eq('aircraft_id', params.id)
      .order('log_date', { ascending: false })
      .limit(10),
    supabase.from('pilots').select('*').neq('status', 'inactive').order('last_name'),
  ])

  // Calculate hours til next inspection (assume 100hr interval)
  const nextInspectionDue = Math.ceil(aircraft.airframe_hours / 100) * 100
  const hoursTilInspection = nextInspectionDue - aircraft.airframe_hours

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/dashboard/fleet" className="text-muted-foreground hover:text-foreground text-sm mb-1 inline-block">
            ← Fleet
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{aircraft.name}</h1>
            <span className={`badge-status ${getAircraftStatusColor(aircraft.status)}`}>
              {getAircraftStatusLabel(aircraft.status)}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{aircraft.registration} · {aircraft.make} {aircraft.model} {aircraft.year}</p>
        </div>
        <div className="flex gap-2">
          <UpdateAircraftStatus aircraft={aircraft} />
          <LogFlightForm aircraft={aircraft} pilots={pilots || []} />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Airframe Hours</p>
          <p className="text-2xl font-bold text-foreground">{aircraft.airframe_hours.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">total hours</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Engine 1</p>
          <p className="text-2xl font-bold text-foreground">{aircraft.engine1_hours.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">hours</p>
        </div>
        {aircraft.engine2_hours > 0 && (
          <div className="stat-card">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Engine 2</p>
            <p className="text-2xl font-bold text-foreground">{aircraft.engine2_hours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">hours</p>
          </div>
        )}
        <div className="stat-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Cycles</p>
          <p className="text-2xl font-bold text-foreground">{aircraft.total_cycles}</p>
          <p className="text-xs text-muted-foreground">landings</p>
        </div>
      </div>

      {/* Progress bar to next inspection */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Next 100-Hour Inspection</h3>
          <span className="text-sm font-medium text-foreground">
            {hoursTilInspection.toFixed(1)} hrs remaining
          </span>
        </div>
        <div className="w-full h-2.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${hoursTilInspection < 10 ? 'bg-red-500' : hoursTilInspection < 25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${100 - (hoursTilInspection / 100) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">{(aircraft.airframe_hours % 100).toFixed(1)} hrs since last</span>
          <span className="text-xs text-muted-foreground">Due at {nextInspectionDue}h</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Maintenance Items */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="section-header flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Maintenance Schedule
            </h2>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {maintenance?.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <span className={`badge-status text-xs ${getMaintenanceStatusColor(item.status)}`}>{item.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{item.maintenance_type.replace(/_/g, ' ')}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {item.due_date && <span>📅 {formatDate(item.due_date)}</span>}
                    {item.due_hours && <span>⏱ {item.due_hours}h</span>}
                    {item.vendor && <span>🔧 {item.vendor}</span>}
                  </div>
                </div>
                {item.estimated_cost && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatCurrency(item.estimated_cost)}</span>
                )}
              </div>
            ))}
            {(!maintenance || maintenance.length === 0) && (
              <div className="px-5 py-6 text-center text-muted-foreground text-sm">No maintenance items</div>
            )}
          </div>
        </div>

        {/* Squawk Log */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="section-header flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Squawk Log
            </h2>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {squawks?.map(sq => (
              <div key={sq.id} className="flex items-start gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{sq.title}</p>
                    <span className={`badge-status text-xs ${getSquawkStatusColor(sq.status)}`}>{sq.status}</span>
                    {sq.grounding && <span className="badge-status text-xs bg-red-900 text-red-200">GROUNDING</span>}
                  </div>
                  {sq.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sq.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(sq.reported_at)}
                    {(sq.reporter as any) && ` · ${(sq.reporter as any).first_name} ${(sq.reporter as any).last_name}`}
                  </p>
                </div>
              </div>
            ))}
            {(!squawks || squawks.length === 0) && (
              <div className="px-5 py-6 text-center text-muted-foreground text-sm">No squawks logged</div>
            )}
          </div>
        </div>

        {/* Recent Flight Logs */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="section-header flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Flight Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Route</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">PIC</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Hobbs</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Cycles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLogs?.map(log => (
                  <tr key={log.id} className="table-row-hover">
                    <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{formatDate(log.log_date)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {log.origin_icao && log.destination_icao
                        ? `${log.origin_icao} → ${log.destination_icao}`
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {(log.pic as any) ? `${(log.pic as any).first_name} ${(log.pic as any).last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground text-right">
                      {log.flight_time_hrs ? `${log.flight_time_hrs.toFixed(1)}h` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground text-right">{log.cycles}</td>
                  </tr>
                ))}
                {(!recentLogs || recentLogs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No flight logs yet</td>
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
