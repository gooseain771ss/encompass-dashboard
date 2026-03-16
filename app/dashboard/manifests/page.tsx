'use server'

import { createClient } from '@/lib/supabase/server'
import { ManifestList } from '@/components/manifests/manifest-list'

export default async function ManifestsPage() {
  const supabase = createClient()

  const { data: manifests, error } = await supabase
    .from('manifests')
    .select('*')
    .order('flight_date', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Flight Manifests</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Completed trip records — Hobbs, engine time, fuel
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive">
          Could not load manifests. Make sure migration 006 has been applied in the Supabase SQL editor.
        </div>
      ) : (
        <ManifestList manifests={manifests ?? []} />
      )}
    </div>
  )
}
