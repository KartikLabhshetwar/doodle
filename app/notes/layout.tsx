import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import CreateNoteClient from "@/app/notes/_create-note-client";
import NoteActionsBar from "@/components/editor/NoteActionsBar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-2 text-sm font-semibold">Doodle</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/home">Home</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 pb-2">
            <CreateNoteClient />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-12 items-center justify-between gap-2 px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Separator orientation="vertical" className="mx-2 h-6" />
            <div className="text-sm text-muted-foreground">Notes</div>
          </div>
          <NoteActionsBar user={session?.user} />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}


