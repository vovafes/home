import BottomNav from '@/components/BottomNav'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full max-w-xl mx-auto flex flex-col" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 pb-20">{children}</div>
      <BottomNav />
    </div>
  )
}
