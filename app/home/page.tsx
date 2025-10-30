import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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
  );
}


