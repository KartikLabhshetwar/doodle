import NoteEditor from "@/components/editor/NoteEditor";
import { prisma } from "@/lib/db";
import { TipTapDoc } from "@/lib/validation";
import { notFound } from "next/navigation";

type Props = { params: { id: string } };

export default async function NotePage({ params }: Props) {
  const note = await prisma.note.findUnique({ where: { id: params.id } });
  if (!note) return notFound();

  return (
    <main className="mx-auto max-w-3xl p-6 bg-white">
      <input
        defaultValue={note.title}
        className="mb-4 w-full border-b border-neutral-200 bg-transparent px-0 py-2 text-xl font-semibold outline-none"
        placeholder="Untitled"
      />
      <NoteEditor initialContent={note.contentJson as unknown as TipTapDoc} />
    </main>
  );
}


