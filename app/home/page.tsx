import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import CreateNoteClient from "@/app/notes/_create-note-client";
import { PlusIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId: string | undefined = session?.user?.id;

  const notes = userId
    ? await prisma.note.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true },
        take: 12,
      })
    : [];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-2 text-sm font-semibold">Doodle</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive>
                <Link href="/home">Home</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarGroup>
            <SidebarGroupLabel>Favorites</SidebarGroupLabel>
            <SidebarGroupContent>
              <ul className="space-y-1">
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/notes/${n.id}`}
                      className="flex items-center justify-between truncate rounded-md px-2 py-1 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <span className="truncate">{n.title || "Untitled"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 pb-2">
            <CreateNoteClient className="w-full" />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-12 items-center justify-between gap-2 px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Separator orientation="vertical" className="mx-2 h-6" />
            <div className="text-sm text-muted-foreground">Home</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Create"
                className="hover:bg-muted inline-flex size-8 items-center justify-center rounded-md transition-colors"
              >
                <PlusIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <CreateNoteClient className="w-full justify-start" variant="ghost">
                  New note
                </CreateNoteClient>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <main className="w-full flex-1 p-6">
          <section>
            <h1 className="text-2xl font-semibold">Good afternoon</h1>
            {userId ? (
              <>
                <h2 className="mt-6 text-sm font-medium text-muted-foreground">Recently visited</h2>
                {notes.length === 0 ? (
                  <p className="mt-3 text-muted-foreground">No recent notes.</p>
                ) : (
                  <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {notes.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={`/notes/${n.id}`}
                          className="block rounded-lg border p-4 transition-colors hover:bg-muted/40"
                        >
                          <div className="truncate font-medium">{n.title || "Untitled"}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {new Date(n.updatedAt).toLocaleString()}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="mt-6 rounded-lg border p-6">
                <p className="text-muted-foreground">Sign in to see your recent notes.</p>
              </div>
            )}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


