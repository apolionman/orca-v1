import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function PUT(request: Request, context: any) {
  const { id } = context.params;
  const body = await request.json();
  const supabase = await createClient()
  const { title, job_id, start, end, all_day, calendar, members } = body

  const { error } = await supabase
    .from('events')
    .update({
      title,
      job_id,
      start,
      end,
      all_day,
      calendar,
      members,
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Event updated successfully' })
}
