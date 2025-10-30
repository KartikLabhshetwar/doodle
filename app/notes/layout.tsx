import SidebarLayout from "@/components/layout/SidebarLayout";
import type { ReactNode } from "react";

export default async function NotesLayout({ children }: { children: ReactNode }) {
  return <SidebarLayout title="Notes">{children}</SidebarLayout>;
}


