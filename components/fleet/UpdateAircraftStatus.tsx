'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Aircraft, AircraftStatus } from '@/types/database'
import { getAircraftStatusLabel } from '@/lib/utils'
import { Settings } from 'lucide-react'

const statuses: AircraftStatus[] = ['available', 'in_flight', 'maintenance', 'aog']

export function UpdateAircraftStatus({ aircraft }: { aircraft: Aircraft }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const supabase = createClient()

  async function handleChange(status: AircraftStatus) {
    startTransition(async () => {
      await supabase.from('aircraft').update({ status }).eq('id', aircraft.id)
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Settings className="w-4 h-4 text-muted-foreground" />
      <select
        value={aircraft.status}
        onChange={e => handleChange(e.target.value as AircraftStatus)}
        disabled={isPending}
        className="input-base py-1.5 text-sm w-auto"
      >
        {statuses.map(s => (
          <option key={s} value={s}>{getAircraftStatusLabel(s)}</option>
        ))}
      </select>
    </div>
  )
}
