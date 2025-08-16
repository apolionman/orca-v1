import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { title, job_id, start, end, level, members } = await request.json()

  if (!title || !start || !end) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Insert event
  const { data: insertedEvents, error: eventError } = await supabase.from('events').insert({
    title,
    job_id,
    start_date: start,
    end_date: end,
    level,
  })
  .select('id')
  .single();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 })
  }

  const eventId = insertedEvents.id;

  // 2. Insert event_crew entries
  // members is expected to be an array of crew_member ids (strings)
  if (Array.isArray(members) && members.length > 0) {
    const eventCrewInserts = members.map((member: { id: string }) => ({
        event_id: eventId,
        crew_member_id: member.id,
      }))
    
    const eventCrewEventInserts = members.map((member: { id: string }) => ({
        event_id: eventId,
        crew_id: member.id,
      }))

    const { error: eventCrewError } = await supabase
      .from('event_crew')
      .insert(eventCrewInserts)

    if (eventCrewError) {
      return NextResponse.json({ error: eventCrewError.message }, { status: 500 })
    }

    const { error: eventCrewJobError } = await supabase
      .from('event_crew_job_orders')
      .insert(eventCrewEventInserts)

    if (eventCrewJobError) {
      return NextResponse.json({ error: eventCrewJobError.message }, { status: 500 })
    }

  }
  return NextResponse.json({ message: 'Event and crew members created successfully' }, { status: 201 })
}
