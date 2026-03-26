import { Sidebar } from '@/components/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <Sidebar />
      <main className="flex-1 overflow-y-auto print:overflow-visible print:h-auto">
        <div className="pt-14 lg:pt-0 print:pt-0">
          {children}
        </div>
      </main>
    </div>
  )
}
