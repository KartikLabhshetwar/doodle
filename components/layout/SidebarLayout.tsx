import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarInset,
  SidebarTrigger,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import NoteActionsBar from "@/components/editor/NoteActionsBar";
import SearchCommand from "@/components/layout/SearchCommand";
import SidebarNoteItem from "@/components/layout/SidebarNoteItem";
import IconHouse from "@/components/ui/IconHouse";
import { createNote } from "@/app/notes/actions";
import AiChatLauncher from "@/components/ai/AiChatLauncher";
import SidebarTools from "@/components/layout/SidebarTools";
import { Button } from "@/components/ui/button";
import IconFeather from "@/components/ui/IconFeather";

type Props = {
  title: string;
  children: React.ReactNode;
};

export default async function SidebarLayout({ title, children }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId: string | undefined = session?.user?.id;

  const notes = userId
    ? await prisma.note.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true },
        take: 12,
      })
    : [];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-2 text-sm font-semibold flex items-center gap-2">
            <IconFeather className="size-4" aria-hidden />
            Doodle
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu></SidebarMenu>
          <SidebarGroup>
            <SidebarGroupLabel>Notes</SidebarGroupLabel>
            <SidebarGroupContent>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/home"
                    aria-label="Home"
                    className="flex items-center gap-2 truncate rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <IconHouse className="size-4" />
                    Home
                  </Link>
                </li>
                <li>
                  <SearchCommand asListItem notes={notes} />
                </li>
                {notes.map((n) => (
                  <li key={n.id}>
                    <SidebarNoteItem id={n.id} title={n.title} />
                  </li>
                ))}
              </ul>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 pb-2 space-y-2">
            <form action={createNote}>
              <button className="w-full rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                New note
              </button>
            </form>
            <SidebarTools />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-12 items-center justify-between gap-2 px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Separator orientation="vertical" className="mx-2 h-6" />
            <div className="text-sm text-muted-foreground">{title}</div>
          </div>
          <div className="flex items-center gap-1">
            <AiChatLauncher />
            <DropdownMenu>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <form action={createNote}>
                    <Button type="submit" className="w-full justify-start text-left px-2 py-1 text-sm">
                      New note
                    </Button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NoteActionsBar user={session?.user} />
          </div>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}


