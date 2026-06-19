export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-full flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
