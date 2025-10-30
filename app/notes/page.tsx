import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import CreateNoteClient from "@/app/notes/_create-note-client";

export default async function NotesIndexPage() {
  // Get current session via better-auth (nextCookies plugin handles cookies on server)
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId: string | undefined = session?.user?.id;

  const notes = userId
    ? await prisma.note.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true },
      })
    : [];

  return (
    <main className="mx-auto w-full p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <CreateNoteClient />
      </div>

      {notes.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No notes yet. Create one to get started.</p>
      ) : (
        <ul className="mt-4 divide-y">
          {notes.map((n) => (
            <li key={n.id} className="py-3">
              <Link href={`/notes/${n.id}`} className="flex items-center justify-between">
                <span className="truncate">{n.title || "Untitled"}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(n.updatedAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}


