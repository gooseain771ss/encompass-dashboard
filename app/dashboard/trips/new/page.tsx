import { createClient } from '@/lib/supabase/server'
import { NewQuoteForm } from '@/components/trips/NewQuoteForm'

export default async function NewQuotePage() {
  const supabase = createClient()

  const [{ data: aircraft }, { data: pilots }, { data: airports }] = await Promise.all([
    supabase.from('aircraft').select('*').order('name'),
    supabase.from('pilots').select('*').neq('status', 'inactive').order('last_name'),
    supabase.from('airports').select('icao, name, city, state, latitude, longitude').order('icao').limit(200),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Quote</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Build a trip quote with auto-calculated pricing</p>
      </div>
      <NewQuoteForm aircraft={aircraft || []} pilots={pilots || []} airports={airports || []} />
    </div>
  )
}
