import NoteContent from "@/components/editor/NoteContent";
import NoteTitle from "@/components/editor/NoteTitle";
import { prisma } from "@/lib/db";
import { TipTapDocType } from "@/lib/validation";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Props = { params: Promise<{ id: string }> };

export default async function NotePage({ params }: Props) {
  const { id } = await params;
  if (!id) return notFound();
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) return notFound();
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="w-full flex-1 p-6">
      <div className="mb-4">
        <NoteTitle noteId={note.id} initialTitle={note.title} />
      </div>
      <NoteContent noteId={note.id} initialContent={note.contentJson as unknown as TipTapDocType} />
    </main>
  );
}


