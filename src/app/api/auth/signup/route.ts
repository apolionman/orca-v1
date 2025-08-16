import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import path from 'path'
import fs from 'fs/promises'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { email, password, full_name, type } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const userId = data.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'User ID not returned after sign-up' }, { status: 500 })
  }

  // === Upload placeholder avatar ===
  const avatarFilename = `${userId}.jpg`
  const placeholderPath = path.join(process.cwd(), 'public', 'images', 'user', 'owner.jpg')

  try {
    const fileBuffer = await fs.readFile(placeholderPath)

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(avatarFilename, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error("Avatar upload failed:", uploadError.message)
    }
  } catch (err) {
    console.error("Reading placeholder image failed:", err)
  }

  const publicAvatarUrl = supabase.storage
    .from('avatars')
    .getPublicUrl(avatarFilename).data.publicUrl

  // === Insert user profile ===
  const { error: subError } = await supabase
    .from('crew_members')
    .insert({
      user_id: userId,
      full_name: full_name,
      email: email,
      type: type,
      currency: 'AED',
      avatar_url: publicAvatarUrl,
    })

  if (subError) {
    return NextResponse.json({ error: `Failed to create crew member: ${subError.message}` }, { status: 500 })
  }

  return NextResponse.json({ user: data.user })
}
