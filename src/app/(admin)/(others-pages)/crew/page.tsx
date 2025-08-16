import BasicTableOne from "@/components/tables/CrewListTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "AF Crew | List",
  description:
    "Meet the ActionFilmz crew",
};
export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Crew List" />
      <BasicTableOne />
    </div>
  );
}
