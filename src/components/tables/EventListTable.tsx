"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Button from "../ui/button/Button";
import { supabaseClient } from "@/utils/supabase/client";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Label from "../form/Label";
import { Modal } from "@/components/ui/modal";
import dayjs from "dayjs";

interface Event {
  id: number;
  title: string;
  job_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
  vehicles?: string[]; // assume array of vehicle names or ids
  crew_members?: { id: number; full_name: string }[]; // event_crew relation
}

export default function EventListTable() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    job_id: "",
    start_date: "",
    end_date: "",
    notes: "",
    vehicles: "",
  });

  const fetchEvents = async () => {
    setLoading(true);

    // Fetch events and include related crew, notes, vehicles
    const { data, error } = await supabaseClient
      .from("events")
      .select(
        `
        id,
        title,
        job_id,
        start_date,
        end_date,
        event_note ( note ),
        event_vehicle ( vehicle_name ),
        event_crew (
          crew_member_id,
          crew_member:crew_member_id ( full_name )
        )
      `
      );

    if (error) {
      console.error("Error fetching events:", error.message);
      setLoading(false);
      return;
    }

    // Map fetched data to Event interface
    const enrichedEvents = data.map((e: any) => ({
      id: e.id,
      title: e.title,
      job_id: e.job_id,
      start_date: e.start_date,
      end_date: e.end_date,
      notes: e.event_note?.note || "",
      vehicles: e.event_vehicle?.map((v: any) => v.vehicle_name) || [],
      crew_members:
        e.event_crew?.map((ec: any) => ({
          id: ec.crew_member_id,
          full_name: ec.crew_member?.full_name,
        })) || [],
    }));

    setEvents(enrichedEvents);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNotesChange = (value: string) => {
    setForm(prev => ({ ...prev, notes: value }));
  };

  // Submit new event
  const handleAddEvent = async () => {
    if (!form.title || !form.job_id || !form.start_date || !form.end_date) {
      alert("Please fill required fields.");
      return;
    }

    // Insert new event
    const { data: newEvent, error } = await supabaseClient
      .from("events")
      .insert([
        {
          title: form.title,
          job_id: form.job_id,
          start_date: form.start_date,
          end_date: form.end_date,
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error adding event: " + error.message);
      return;
    }

    // Insert note if any
    if (form.notes.trim()) {
      await supabaseClient.from("event_note").insert({
        event_id: newEvent.id,
        note: form.notes,
      });
    }

    // Insert vehicles if any (assume comma separated string input)
    if (form.vehicles.trim()) {
      const vehicleNames = form.vehicles.split(",").map((v) => v.trim());
      for (const name of vehicleNames) {
        await supabaseClient.from("event_vehicle").insert({
          event_id: newEvent.id,
          vehicle_name: name,
        });
      }
    }

    setShowAddModal(false);
    setForm({
      title: "",
      job_id: "",
      start_date: "",
      end_date: "",
      notes: "",
      vehicles: "",
    });
    fetchEvents(); // Refresh
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Event List</h2>
        <Button onClick={() => setShowAddModal(true)}>Add New Event</Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell isHeader>Title</TableCell>
              <TableCell isHeader>Job ID</TableCell>
              <TableCell isHeader>Start Date</TableCell>
              <TableCell isHeader>End Date</TableCell>
              <TableCell isHeader>Notes</TableCell>
              <TableCell isHeader>Vehicles</TableCell>
              <TableCell isHeader>Crew Members</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-4">
                  No events found.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>{event.job_id}</TableCell>
                  <TableCell>{dayjs(event.start_date).format("YYYY-MM-DD")}</TableCell>
                  <TableCell>{dayjs(event.end_date).format("YYYY-MM-DD")}</TableCell>
                  <TableCell>{event.notes || "—"}</TableCell>
                  <TableCell>
                    {event.vehicles && event.vehicles.length > 0
                      ? event.vehicles.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {event.crew_members && event.crew_members.length > 0
                      ? event.crew_members.map((c) => c.full_name).join(", ")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <Modal isOpen={true} onClose={() => setShowAddModal(false)}>
          <div className="space-y-4">
            <Label>Title</Label>
            <Input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
            <Label>Job ID</Label>
            <Input
              name="job_id"
              value={form.job_id}
              onChange={handleChange}
              required
            />
            <Label>Start Date</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={handleChange}
              required
            />
            <Label>End Date</Label>
            <Input
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={handleChange}
              required
            />
            <Label>Notes</Label>
            <TextArea
              value={form.notes}
              onChange={handleNotesChange}
              placeholder="Optional notes"
            />
            <Label>Vehicles</Label>
            <Input
              name="vehicles"
              value={form.vehicles}
              onChange={handleChange}
              placeholder="Comma separated (e.g. Truck, Van)"
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEvent}>Add Event</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
