import EventListTable from "@/components/tables/EventListTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "AF Event | List",
  description:
    "List of Events",
};
export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Event List" />
      <EventListTable />
    </div>
  );
}
