import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { IdParamSchema, TodoCreateSchema } from "@/lib/validation";
import { getUserIdFromRequest, requireUser } from "@/lib/auth";

function getNoteId(req: Request) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").slice(-2, -1)[0] || "";
  const parsed = IdParamSchema.safeParse({ id });
  if (!parsed.success) {
    const err = new Error("Invalid id");
    // @ts-expect-error status used by caller
    (err as any).status = 400;
    throw err;
  }
  return parsed.data.id;
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireUser(userId);
    const noteId = getNoteId(req);
    const body = await req.json();

    const parsed = TodoCreateSchema.safeParse({ ...body, noteId });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const ownerCheck = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId }, select: { id: true } });
    if (!ownerCheck) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const created = await prisma.todo.create({
      data: { noteId, text: parsed.data.text },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal Error" }, { status });
  }
}


