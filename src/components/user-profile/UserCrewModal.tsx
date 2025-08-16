"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Dialog } from "@headlessui/react";
import { supabaseClient } from "@/utils/supabase/client";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import Image from "next/image";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

interface CrewMember {
  id: number;
  full_name: string;
  type: string;
  avatar_url: string;
  role: string;
  status: string;
}

interface Event {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
}

interface JobOrder {
  id: number;
  event_id: number;
  crew_id: number;
  rate: number;
  currency: string;
  unit: "daily" | "weekly" | "monthly" | null; 
}

interface Props {
  crewMember: CrewMember;
  onClose: () => void;
}

export default function CrewProfileModal({ crewMember, onClose }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceStartDate, setInvoiceStartDate] = useState<Date | null>(null);
  const [invoiceEndDate, setInvoiceEndDate] = useState<Date | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: jobData } = await supabaseClient
        .from("event_crew_job_orders")
        .select("id, event_id, crew_id, rate, currency, unit")
        .eq("crew_id", crewMember.id);

      const eventIds = jobData?.map((j) => j.event_id) || [];

      const { data: eventData } = await supabaseClient
        .from("events")
        .select("id, title, start_date, end_date")
        .in("id", eventIds);

      setJobOrders(jobData || []);
      setEvents(eventData || []);
      setLoading(false);
    };

    fetchData();
  }, [crewMember.id]);

  const handleJobChange = (id: number, field: keyof JobOrder, value: any) => {
    setJobOrders((prev) =>
      prev.map((j) => (j.id === id ? { ...j, [field]: value } : j))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    for (const job of jobOrders) {
      const updatedCurrency = job.currency || "AED";
      const updatedUnit = job.unit || "daily";
      await supabaseClient
        .from("event_crew_job_orders")
        .update({
          rate: job.rate,
          currency: updatedCurrency,
          unit: updatedUnit,
        })
        .eq("id", job.id);

        console.log("Updating job:", job.id, {
          rate: job.rate,
          currency: updatedCurrency,
          unit: updatedUnit,
        });
    }
    setIsSaving(false);
    toast.success("Saved successfully");
  };

  const handleGenerateInvoice = async () => {
    setIsGenerating(true);
    if (!invoiceStartDate || !invoiceEndDate) {
      toast.error("Please select both start and end dates.");
      return;
    }
  
    const filtered = jobOrders.filter((job) => {
      const event = events.find((e) => e.id === job.event_id);
      if (!event) return false;
  
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
  
      return eventEnd >= invoiceStartDate && eventStart <= invoiceEndDate;
    });
  
    const breakdown = filtered.map((job) => {
      const event = events.find((e) => e.id === job.event_id);
      if (!event) return null;
  
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
  
      const start = invoiceStartDate > eventStart ? invoiceStartDate : eventStart;
      const end = invoiceEndDate < eventEnd ? invoiceEndDate : eventEnd;
  
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      let total = 0;
  
      if (job.unit === "daily") total = job.rate * days;
      else if (job.unit === "weekly") total = job.rate * Math.ceil(days / 7);
      else if (job.unit === "monthly") total = job.rate * Math.ceil(days / 30);
  
      return {
        job_order_id: job.id,
        title: event.title,
        rate: job.rate,
        currency: job.currency,
        unit: job.unit,
        days,
        total,
      };
    }).filter(Boolean);
  
    const totalAmount = breakdown.reduce((acc, item) => acc + item.total, 0);
  
    // PDF generation logic to come next...
  
    // Save invoice in Supabase
    const { data, error } = await supabaseClient.from("invoices").insert({
      crew_id: crewMember.id,
      start_date: invoiceStartDate.toISOString(),
      end_date: invoiceEndDate.toISOString(),
      total: totalAmount,
      job_order_ids: breakdown.map(b => b.job_order_id),
      breakdown: breakdown,
    });

    console.log("Breakdown to insert:", JSON.stringify(breakdown, null, 2));
  
    if (error) {
      toast.error("Failed to save invoice");
      console.error(error);
    } else {
      toast.success("Invoice generated and saved");
    }

    const doc = new jsPDF();
    const startY = 15;
    let y = startY;

    const formattedStartDate = invoiceStartDate?.toLocaleDateString("en-GB") || "-";
    const formattedEndDate = invoiceEndDate?.toLocaleDateString("en-GB") || "-";

    doc.setFontSize(12);
    doc.text(`Invoice for: ${crewMember.full_name}`, 14, y);
    y += 7;
    doc.text(`Crew ID: ${crewMember.id}`, 14, y);
    y += 7;
    doc.text(`Position: ${crewMember.role}`, 14, y);
    y += 7;
    doc.text(`Status: ${crewMember.status}`, 14, y);
    y += 7;
    doc.text(`Invoice Date Range: ${formattedStartDate} to ${formattedEndDate}`, 14, y);
    y += 10;

    // Create table rows from breakdown
    const tableData = breakdown.map((item) => [
      item.title,
      `${item.days} (${item.unit}) ${item.days > 1 ? '' : ''}`,
      `${item.rate.toLocaleString()} ${item.currency}`,
      `${item.total.toLocaleString()}`,
    ]);

    // Add the table
    autoTable(doc, {
      startY: y,
      head: [['Job Title', 'Units', 'Rate', 'Total']],
      body: tableData,
    });

    // Add total below table
    const finalY = (doc as any).lastAutoTable.finalY || 30;
    doc.text(`Total: ${totalAmount.toLocaleString()} AED`, 10, finalY + 10);

    doc.save(`Invoice-${crewMember.full_name}.pdf`);
  
    setIsGenerating(false);
  };  

  return (
    <Dialog open={true} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Panel className="w-full max-w-5xl p-6 bg-white rounded-lg shadow-xl dark:text-gray-400 dark:bg-gray-900 border border-gray-300/30 dark:border-white/10 backdrop-blur-sm">
          <Dialog.Title className="text-xl font-bold mb-6">
            {crewMember.full_name} - Profile & Job Orders
          </Dialog.Title>

          <div className="grid grid-cols-12 gap-6">
            {/* Left column: Crew Info */}
            <div className="col-span-2 flex flex-col items-center space-y-4 border-r border-gray-300/30 dark:border-white/10 pr-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden">
                <Image
                  src={crewMember.avatar_url?.trim() || "/images/user/owner.jpg"}
                  alt={crewMember.full_name}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{crewMember.full_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{crewMember.role}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{crewMember.status}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{crewMember.type}</p>
              </div>
            </div>

            {/* Right column: Job Orders */}
            <div className="col-span-10 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <p>Loading...</p>
              ) : jobOrders.length === 0 ? (
                <p>No job orders found.</p>
              ) : (
                <Table className="w-full">
                  {/* Table Header */}
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Event
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Event Start
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Event End
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Rate
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Currency
                      </TableCell>
                      <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                        Unit
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
                    ) : jobOrders.length === 0 ? (
                      <TableRow>
                        <TableCell className="py-4 text-center text-gray-500 text-theme-sm dark:text-gray-400">
                          No job orders found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      jobOrders.map((job) => {
                        const event = events.find((e) => e.id === job.event_id);
                        return (
                          <TableRow key={job.id} className="even:bg-gray-50 dark:even:bg-gray-900">
                            <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300">
                              {event?.title || "Unknown Event"}
                            </TableCell>
                            <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300">
                              {event?.start_date || "Unknown Event"}
                            </TableCell>
                            <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300">
                              {event?.end_date || "Unknown Event"}
                            </TableCell>
                            <TableCell className="px-5 py-3">
                              <input
                                type="number"
                                value={job.rate || 0}
                                onChange={(e) => handleJobChange(job.id, "rate", parseFloat(e.target.value))}
                                className="w-full border border-gray-300 rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                              />
                            </TableCell>
                            <TableCell className="px-5 py-3">
                              <input
                                value={job.currency || "AED"}
                                onChange={(e) => handleJobChange(job.id, "currency", e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                              />
                            </TableCell>
                            <TableCell className="px-5 py-3">
                              <select
                                value={job.unit ?? "daily"}
                                onChange={(e) => handleJobChange(job.id, "unit", e.target.value as "daily" | "weekly" | "monthly")}
                                className="w-full border border-gray-300 rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                              >
                                <option value="" disabled>
                                  Select Unit
                                </option>
                                <option value="daily">Per Day</option>
                                <option value="weekly">Per Week</option>
                                <option value="monthly">Per Month</option>
                              </select>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

              )}
            </div>
          </div>
          {/* Bottom row: Invoice Date + Buttons */}
          <div className="mt-6 border-t pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Start:</span>
              <DatePicker
                selected={invoiceStartDate}
                onChange={(date: Date | null) => setInvoiceStartDate(date)}
                className="border px-3 py-2 rounded"
              />
              <span className="font-semibold">End:</span>
              <DatePicker
                selected={invoiceEndDate}
                onChange={(date: Date | null) => setInvoiceEndDate(date)}
                className="border px-3 py-2 rounded"
              />
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
              <Button variant="outline" onClick={handleGenerateInvoice} disabled={isGenerating || !invoiceStartDate || !invoiceEndDate}>{isGenerating ? "Generating..." : "Generate Invoice"}</Button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}