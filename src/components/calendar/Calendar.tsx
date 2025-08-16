"use client";
import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { supabaseClient } from '@/utils/supabase/client';
import Avatar from "../user-profile/UserAvatar";
import Image from "next/image";
import toast from "react-hot-toast";
import { useRouter } from 'next/navigation';

interface CalendarEvent extends EventInput {
  extendedProps: {
    level: string;
    members?: CrewMember[];
  };
}

type CrewMember = {
  id: string;
  avatar_url: string;
  full_name: string;
};

type Events = {
  id: string;
  title: string;
  job_id: string;
  start_date: Date;
  end_date: Date;
};

const Calendar: React.FC = () => {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventJobID, setEventJobID] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [eventMembers, setEventMembers] = useState<CrewMember[]>([]);
  const [newMember, setNewMember] = useState<string>("");
  const [eventList, setEventList] = useState<Events[]>([]);
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [filteredCrew, setFilteredCrew] = useState<CrewMember[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [eventFile, setEventFile] = useState<File | null>(null);

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  useEffect(() => {
    async function checkSession() {
      const response = await supabaseClient.auth.getSession();
      console.log("Session:", response.data.session);
    }
  
    checkSession();
  }, []);

  useEffect(() => {
    const fetchCrew = async () => {
      const { data, error } = await supabaseClient.from("crew_members").select("id, full_name, avatar_url");
      if (data) setCrewList(data);
    };
    fetchCrew();
  }, []);

  useEffect(() => {
    const fetchAndSetEvents = async () => {
      const { data, error } = await supabaseClient
        .from("events")
        .select("*"); // Adjust columns as needed
  
      if (error) {
        console.error("Error fetching events:", error);
        return;
      }
  
      const fetchedEvents: CalendarEvent[] = (data || []).map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        start: item.start_date,
        end: item.end_date,
        extendedProps: {
          level: item.level || 'Success',
          members: item.members || [],
        },
      }));
  
      setEvents(fetchedEvents);
    };
  
    fetchAndSetEvents();
  
    const interval = setInterval(fetchAndSetEvents, 30 * 60 * 1000); // every 30 minutes
  
    return () => clearInterval(interval);
  }, []);  

  console.log(eventList);

  useEffect(() => {
    if (newMember.trim() === "") {
      setFilteredCrew([]);
      return;
    }
  
    const results = crewList.filter((member) =>
      member.full_name.toLowerCase().includes(newMember.toLowerCase())
    );
  
    setFilteredCrew(results);
  }, [newMember, crewList]);

  useEffect(() => {
    // Initialize with some events
    setEvents([
      {
        id: "1",
        title: "Event Conf.",
        start: new Date().toISOString().split("T")[0],
        extendedProps: { level: "Danger" },
      },
      {
        id: "2",
        title: "Meeting",
        start: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        extendedProps: { level: "Success" },
      },
      {
        id: "3",
        title: "Workshop",
        start: new Date(Date.now() + 172800000).toISOString().split("T")[0],
        end: new Date(Date.now() + 259200000).toISOString().split("T")[0],
        extendedProps: { level: "Primary" },
      },
    ]);
  }, []);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = async (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id;
    
    const { data: eventData, error: eventError } = await supabaseClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

    if (eventError || !eventData) {
      console.error("Failed to fetch event:", eventError);
      return;
    }

    const { data: crewData, error: crewError } = await supabaseClient
    .from("event_crew")
    .select("crew_member:crew_member_id(id, full_name, avatar_url)")
    .eq("event_id", eventId);

    if (crewError) {
      console.error("Failed to fetch event crew:", crewError);
    }

    const members: CrewMember[] = (crewData || [])
    .map((item: any) => item.crew_member)
    .filter((member: any): member is CrewMember =>
      member && typeof member.id === 'string' && typeof member.full_name === 'string' && typeof member.avatar_url?.trim() === 'string'
    );

    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventJobID(eventData.job_id);
    setEventStartDate(eventData.start_date?.split("T")[0] || "");
    setEventEndDate(eventData.end_date?.split("T")[0] || "");
    setEventLevel(eventData.level || "Success");
    setEventMembers(members);

    openModal();
  };

  const handleAddOrUpdateEvent = async () => {
    let file_url = null;
  
    if (eventFile) {
      const fileExt = eventFile.name.split('.').pop();
      const filePath = `events/${Date.now()}.${fileExt}`;
  
      const { data, error } = await supabaseClient.storage
        .from('filedirectory')
        .upload(filePath, eventFile, {
          upsert: true,
        });

      if (error || !data) {
        console.error("File upload error:", JSON.stringify(error, null, 2));
        toast.error("Failed to upload file.");
        return;
      }

  
      file_url = data?.path;
    }
  
    const eventData = {
      title: eventTitle,
      job_id: eventJobID,
      start: eventStartDate,
      end: eventEndDate,
      level: eventLevel,
      members: eventMembers,
      file_url: file_url,
    };
  
    try {
      if (selectedEvent) {
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === selectedEvent.id
              ? { ...event, ...eventData, id: selectedEvent.id }
              : event
          )
        );
  
        const res = await fetch(`/api/crud/events/${selectedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
  
        if (!res.ok) {
          const errorRes = await res.json();
          throw new Error(errorRes.error || 'Failed to update event');
        }
  
        toast.success("Event updated successfully");
        router.refresh();
      } else {
        const newId = Date.now().toString();
        const newEvent: CalendarEvent = {
          id: newId,
          title: eventTitle,
          job_id: eventJobID,
          start: eventStartDate,
          end: eventEndDate,
          extendedProps: {
            level: eventLevel,
            members: eventMembers,
          },
        };
  
        setEvents((prevEvents) => [...prevEvents, newEvent]);
  
        const res = await fetch('/api/crud/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: newId, ...eventData }),
        });
  
        if (!res.ok) {
          const errorRes = await res.json();
          throw new Error(errorRes.error || 'Failed to create event');
        }
        
        toast.success("Event added successfully");
        router.refresh();
      }
  
      closeModal();
      resetModalFields();
    } catch (error: any) {
      console.error('Supabase error:', error.message);
      alert(`Error: ${error.message}`);
    }
  };  

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("");
    setSelectedEvent(null);
    setEventMembers([]);
    setNewMember("");
  };

  return (
    <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next addEventButton",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          customButtons={{
            addEventButton: {
              text: "Add Event +",
              click: openModal,
            },
          }}
        />
      </div>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-6 lg:p-10"
      >
        <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
          <div>
            <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
              {selectedEvent ? "Edit Event" : "Add Event"}
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Schedule your event/shoot.
            </p>
          </div>
          <div className="mt-8">
            <div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Title
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>
            <div>
              <div>
                <label className="mb-1.5 mt-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Job ID Reference
                </label>
                <input
                  id="event-jobID"
                  type="text"
                  placeholder="0000-00000-0000-0000"
                  value={eventJobID}
                  onChange={(e) => setEventJobID(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Attach File
              </label>
              <input
                type="file"
                onChange={(e) => setEventFile(e.target.files?.[0] || null)}
                className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-white hover:file:bg-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Add Event Members
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  placeholder="Type to search crew..."
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
                {filteredCrew.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-300 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {filteredCrew.map((member) => (
                      <li
                        key={member.id}
                        onClick={() => {
                          if (!eventMembers.find((m) => m.id === member.id)) {
                            setEventMembers([...eventMembers, member]);
                            setNewMember("");
                            setFilteredCrew([]);
                          }
                        }}
                        className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      >
                        <div className="flex items-center gap-2">
                        {member.avatar_url?.trim() ? (
                          <Image
                            width={24}
                            height={24}
                            src={member.avatar_url.trim()}
                            alt={member.full_name}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <Avatar src={undefined} name={member.full_name} size={24} />
                        )}
                          <span>{member.full_name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {eventMembers.map((member, index) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-white/80"
                  >
                    {member.full_name}
                    <button
                      type="button"
                      onClick={() =>
                        setEventMembers(eventMembers.filter((_, i) => i !== index))
                      }
                      className="ml-2 rounded-full p-0.5 hover:bg-gray-300 dark:hover:bg-white/10"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                Event Color
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                {Object.entries(calendarsEvents).map(([key, value]) => (
                  <div key={key} className="n-chk">
                    <div
                      className={`form-check form-check-${value} form-check-inline`}
                    >
                      <label
                        className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                        htmlFor={`modal${key}`}
                      >
                        <span className="relative">
                          <input
                            className="sr-only form-check-input"
                            type="radio"
                            name="event-level"
                            value={key}
                            id={`modal${key}`}
                            checked={eventLevel === key}
                            onChange={() => setEventLevel(key)}
                          />
                          <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                            <span
                              className={`h-2 w-2 rounded-full bg-white ${
                                eventLevel === key ? "block" : "hidden"
                              }`}  
                            ></span>
                          </span>
                        </span>
                        {key}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Enter Start Date
              </label>
              <div className="relative">
                <input
                  id="event-start-date"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Enter End Date
              </label>
              <div className="relative">
                <input
                  id="event-end-date"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
            <button
              onClick={closeModal}
              type="button"
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Close
            </button>
            <button
              onClick={handleAddOrUpdateEvent}
              type="button"
              className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
            >
              {selectedEvent ? "Update Changes" : "Add Event"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.level.toLowerCase()}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="fc-daygrid-event-dot"></div>
      <div className="fc-event-time">{eventInfo.timeText}</div>
      <div className="fc-event-title">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;
