import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isAuthRoute  = pathname === '/login' || pathname === '/register'
  const isSetupRoute = pathname === '/setup'
  const isPublic     = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname === '/favicon.ico'

  if (isPublic) return supabaseResponse

  // Not authenticated
  if (!user) {
    if (isAuthRoute || isSetupRoute) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated — check family membership
  const { data: membership } = await supabase
    .from('family_members')
    .select('family_id')
    .maybeSingle()

  const hasFam = !!membership

  if (isAuthRoute) {
    return NextResponse.redirect(new URL(hasFam ? '/' : '/setup', request.url))
  }
  if (isSetupRoute && hasFam) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (!isSetupRoute && !hasFam) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
