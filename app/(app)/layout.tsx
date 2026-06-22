export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh max-w-xl mx-auto" style={{ background: 'var(--bg)' }}>
      {children}
    </div>
  )
}
