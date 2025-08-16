"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import CrewProfileModal from "@/components/user-profile/UserCrewModal"
import Image from "next/image";
import { supabaseClient } from "@/utils/supabase/client";

// Interface matching your table fields
interface CrewMember {
  id: number;
  full_name: string;
  type: string;
  avatar_url: string;
  role: string;
  status: string;
  project_names: string[];
  team_images: string[];
}

export default function BasicTableOne() {
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [data, setData] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCrewData = async () => {
      setLoading(true);
  
      // 1. Get all crew members
      const { data: crewMembers, error: crewError } = await supabaseClient
        .from("crew_members")
        .select("id, full_name, type, avatar_url, role, status");
  
      if (crewError) {
        console.error("Error fetching crew_members:", crewError.message);
        setLoading(false);
        return;
      }
  
      // 2. Get event_crew links
      const { data: eventCrews, error: eventCrewError } = await supabaseClient
        .from("event_crew")
        .select("event_id, crew_member_id");
  
      if (eventCrewError) {
        console.error("Error fetching event_crew:", eventCrewError.message);
        setLoading(false);
        return;
      }
  
      // 3. Get all events including event_date for filtering
      const { data: events, error: eventError } = await supabaseClient
        .from("events")
        .select("id, title, start_date, end_date");
  
      if (eventError) {
        console.error("Error fetching events:", eventError.message);
        setLoading(false);
        return;
      }
  
      // --- ADD THIS BELOW: filter out past events based on today's date ---
      const today = new Date();
      const upcomingEvents = events.filter(e => new Date(e.end_date) >= today);
  
      // 4. Enrich each crew member
      const enriched = crewMembers.map((member) => {
        // Get all upcoming events this member is part of
        const memberEvents = eventCrews.filter(
          (ec) =>
            ec.crew_member_id === member.id &&
            upcomingEvents.some((e) => e.id === ec.event_id)
        );
  
        const eventIds = memberEvents.map((ec) => ec.event_id);
  
        // Titles of upcoming events only
        const project_names = upcomingEvents
          .filter((e) => eventIds.includes(e.id))
          .map((e) => e.title);
  
        // Team avatars from upcoming shared events only
        const teammateIds = eventCrews
          .filter(
            (ec) =>
              eventIds.includes(ec.event_id) && ec.crew_member_id !== member.id
          )
          .map((ec) => ec.crew_member_id);
  
        const team_images = crewMembers
          .filter((cm) => teammateIds.includes(cm.id))
          .map((cm) => cm.avatar_url?.trim() || "/images/user/owner.jpg");
  
        return {
          ...member,
          project_names,
          team_images,
        };
      });
  
      setData(enriched);
      setLoading(false);
    };
  
    fetchCrewData();
  }, []);  

  const pastelColor = (index: number): string => {
    const colors = [
      "#FFD6E8", // pastel pink
      "#D0F0FD", // pastel blue
      "#DFFFD6", // pastel green
      "#FFF9D6", // pastel yellow
      "#F3D6FD", // pastel purple
      "#FDE9D6", // pastel orange
    ];
    return colors[index % colors.length];
  };

  useEffect(() => {
    console.log("Modal opened for:", selectedMember);
  }, []);
  

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1102px]">
          <Table>
            {/* Table Header */}
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Crew
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Type
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Event/Shoot Name
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Team
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>

            {/* Table Body */}
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="py-4 text-center text-gray-500 text-theme-sm dark:text-gray-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell className="py-4 text-center text-gray-500 text-theme-sm dark:text-gray-400">
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((member) => (
                  <TableRow key={member.id} tabIndex={0} onClick={() => setSelectedMember(member)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
                    {/* Crew Info */}
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-full">
                          <Image
                            width={40}
                            height={40}
                            src={member.avatar_url?.trim() || "/images/user/owner.jpg"}
                            alt={member.full_name}
                          />
                        </div>
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {member.full_name}
                          </span>
                          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                            {member.role}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    {/* Staff Type */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                        {member.type}
                    </TableCell>

                    {/* Project Name */}
                    <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                      {member.project_names?.length > 0 ? (
                        <ul className="space-y-1">
                          {member.project_names.map((name, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: pastelColor(index) }}
                              ></span>
                              <span>{name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* Team Images */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <div className="flex -space-x-2">
                        {member.team_images?.map((img, index) => (
                          <div
                            key={index}
                            className="w-6 h-6 overflow-hidden border-2 border-white rounded-full dark:border-gray-900"
                          >
                            <Image
                              width={24}
                              height={24}
                              src={img}
                              alt={`Team member ${index + 1}`}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <Badge
                        size="sm"
                        color={
                          member.status === "Active"
                            ? "success"
                            : member.status === "Pending"
                            ? "warning"
                            : "error"
                        }
                      >
                        {member.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {selectedMember && (
            <CrewProfileModal
              crewMember={selectedMember}
              onClose={() => setSelectedMember(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
