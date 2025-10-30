"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createNote() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId: string | undefined = session?.user?.id;
  if (!userId) {
    redirect("/home");
  }

  const created = await prisma.note.create({
    data: {
      title: "Untitled",
      contentJson: { type: "doc", content: [] } as any,
      ownerId: userId,
    },
    select: { id: true },
  });

  redirect(`/notes/${created.id}`);
}

export async function deleteNote(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId: string | undefined = session?.user?.id;
  if (!userId) {
    return;
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const exists = await prisma.note.findFirst({ where: { id, ownerId: userId } });
  if (!exists) return;

  await prisma.note.delete({ where: { id } });
  revalidatePath("/home");
}


