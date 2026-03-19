'use server'

import { createClient } from '@/lib/supabase/server'
import { ManifestPrint } from '@/components/manifests/manifest-print'
import { notFound } from 'next/navigation'

export default async function ManifestDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: manifest, error } = await supabase
    .from('manifests')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !manifest) {
    notFound()
  }

  return <ManifestPrint manifest={manifest} />
}
