import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Clear Supabase auth cookies by setting them to empty + expired
  const response = NextResponse.json({ message: 'Signed out successfully' })

  // Supabase default cookie names — adjust if your version uses different names
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'sb-auth-token',
    'sb-auth',
  ]

  cookieNames.forEach((cookieName) => {
    response.cookies.set(cookieName, '', {
      path: '/',
      expires: new Date(0), // expired date to delete
      httpOnly: true,
      // secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  })

  return response
}
