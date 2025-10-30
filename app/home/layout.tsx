import SidebarLayout from "../../components/layout/SidebarLayout";
import React, { type ReactNode } from "react";

export default async function HomeLayout({ children }: { children: ReactNode }) {
  return <SidebarLayout title="Home">{children}</SidebarLayout>;
}


