import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Users, Plus, Phone, Mail, Plane, Clock } from 'lucide-react'
import { AddPilotForm } from '@/components/pilots/AddPilotForm'

export default async function PilotsPage() {
  const supabase = createClient()

  const [{ data: pilots }, { data: aircraft }] = await Promise.all([
    supabase.from('pilots').select('*').order('status').order('last_name'),
    supabase.from('aircraft').select('id, name').order('name'),
  ])

  // Get recent assignments for each pilot
  const { data: recentAssignments } = await supabase
    .from('pilot_assignments')
    .select('pilot_id, quote:quotes(departure_date, origin_icao, destination_icao, status)')
    .order('created_at', { ascending: false })
    .limit(50)

  const assignmentsByPilot = recentAssignments?.reduce((acc, a) => {
    if (!acc[a.pilot_id]) acc[a.pilot_id] = []
    acc[a.pilot_id].push(a.quote)
    return acc
  }, {} as Record<string, any[]>) || {}

  const staffPilots = pilots?.filter(p => p.status === 'staff') || []
  const contractorPilots = pilots?.filter(p => p.status === 'contractor') || []

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pilots</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {staffPilots.length} staff · {contractorPilots.length} contractor{contractorPilots.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AddPilotForm aircraft={aircraft || []} />
      </div>

      {/* Staff Pilots */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Staff Pilots</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffPilots.map(pilot => (
            <PilotCard
              key={pilot.id}
              pilot={pilot}
              recentTrips={assignmentsByPilot[pilot.id] || []}
            />
          ))}
          {staffPilots.length === 0 && (
            <div className="col-span-3 bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
              No staff pilots added yet
            </div>
          )}
        </div>
      </div>

      {contractorPilots.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contractors</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractorPilots.map(pilot => (
              <PilotCard
                key={pilot.id}
                pilot={pilot}
                recentTrips={assignmentsByPilot[pilot.id] || []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PilotCard({ pilot, recentTrips }: { pilot: any; recentTrips: any[] }) {
  const upcomingTrips = recentTrips.filter(t => t?.status === 'scheduled' || t?.status === 'accepted')

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
            {pilot.first_name[0]}{pilot.last_name[0]}
          </div>
          <div>
            <p className="font-semibold text-foreground">{pilot.first_name} {pilot.last_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{pilot.status}</p>
          </div>
        </div>
        {pilot.atp_rated && (
          <span className="badge-status bg-blue-900/50 text-blue-300 text-xs">ATP</span>
        )}
      </div>

      <div className="space-y-1.5 mb-4">
        {pilot.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{pilot.email}</span>
          </div>
        )}
        {pilot.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3.5 h-3.5" />
            <span>{pilot.phone}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <p className="text-sm font-semibold text-foreground">{pilot.total_hours?.toFixed(0) || 0}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <p className="text-sm font-semibold text-foreground">{pilot.pic_hours?.toFixed(0) || 0}</p>
          <p className="text-xs text-muted-foreground">PIC</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-2 text-center">
          <p className="text-sm font-semibold text-foreground">{upcomingTrips.length}</p>
          <p className="text-xs text-muted-foreground">Trips</p>
        </div>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between">
        <div>
          {pilot.daily_rate && (
            <p className="text-xs text-muted-foreground">{formatCurrency(pilot.daily_rate)}/day</p>
          )}
          {pilot.medical_expiry && (
            <p className="text-xs text-muted-foreground">
              Medical exp. {formatDate(pilot.medical_expiry)}
            </p>
          )}
        </div>
        {pilot.medical_expiry && new Date(pilot.medical_expiry) < new Date() && (
          <span className="badge-status bg-red-900/50 text-red-300 text-xs">Medical Expired</span>
        )}
      </div>
    </div>
  )
}
