"use client";

import { useEffect, useState } from "react";
import { supabaseClient } from "@/utils/supabase/client";
import Image from "next/image";
import dayjs from "dayjs";

interface EventData {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

interface CrewMember {
  id: string;
  full_name: string;
  avatar_url: string;
}

type CrewLink = {
  crew_member_id: string;
  crew_members: {
    id: string;
    full_name: string;
    avatar_url: string;
  } | null; // in case the FK join fails
};

export default function ActiveEventsWithCrew() {
  const [events, setEvents] = useState<
    (EventData & { crew: CrewMember[]; currentDay: string })[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      const today = dayjs().format("YYYY-MM-DD");

      // Step 1: Get today's events
      const { data: eventList, error: eventError } = await supabaseClient
        .from("events")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today);

      if (eventError) {
        console.error("Error fetching events:", eventError);
        return;
      }

      if (!eventList?.length) return;

      // Step 2: For each event, get assigned crew
      const enrichedEvents = await Promise.all(
        eventList.map(async (event) => {
          const { data: crewLinks, error: crewError } = await supabaseClient
          .from("event_crew")
          .select(`
            crew_member_id,
            crew_members (
              id,
              full_name,
              avatar_url
            )
          `)
          .eq("event_id", event.id) as unknown as { data: CrewLink[]; error: any };

          if (crewError) {
            console.error("Error fetching event_crew:", crewError);
            return { ...event, crew: [], currentDay: "Unknown" };
          }

          const crew: CrewMember[] = (crewLinks || [])
          .filter(link => link.crew_members) // ensure it's not null
          .map(link => ({
            id: link.crew_member_id,
            full_name: link.crew_members!.full_name || "Unknown",
            avatar_url: link.crew_members!.avatar_url?.trim() || "",
          }));

          const currentDayNum = dayjs(today).diff(event.start_date, "day") + 1;
          const currentDay = `${currentDayNum}${getOrdinal(currentDayNum)} Day`;

          return {
            ...event,
            crew,
            currentDay,
          };
        })
      );

      setEvents(enrichedEvents);
    };

    fetchData();
  }, []);

  function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"],
      v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  return (
    <div className="space-y-6">
      {events.length === 0 ? (
        <p className="text-center text-gray-500">No current events.</p>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            className="p-4 border rounded-xl dark:border-gray-800 bg-white dark:bg-gray-900"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              {event.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Current Day: {event.currentDay}
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {event.crew.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Image
                    src={member.avatar_url || "/default-avatar.png"}
                    alt={member.full_name}
                    width={24}
                    height={24}
                    className="rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-800 dark:text-white">
                    {member.full_name}
                  </span>
                </div>
              ))}
              {event.crew.length === 0 && (
                <p className="text-sm text-gray-400">No crew assigned.</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
