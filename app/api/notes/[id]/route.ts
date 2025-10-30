import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { IdParamSchema, NoteUpdateSchema } from "@/lib/validation";
import { getUserIdFromRequest, requireUser } from "@/lib/auth";

function getIdFromUrl(req: Request) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop() || "";
  const parsed = IdParamSchema.safeParse({ id });
  if (!parsed.success) {
    const err = new Error("Invalid id");
    (err as any).status = 400;
    throw err;
  }
  return parsed.data.id;
}

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireUser(userId);
    const id = getIdFromUrl(req);

    const note = await prisma.note.findFirst({
      where: { id, ownerId: userId },
    });
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ note: { ...note, updatedAt: note.updatedAt.toISOString() } });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal Error" }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireUser(userId);
    const id = getIdFromUrl(req);
    const body = await req.json();
    const parsed = NoteUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const exists = await prisma.note.findFirst({ where: { id, ownerId: userId } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.note.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.contentJson !== undefined ? { contentJson: parsed.data.contentJson } : {}),
      },
      select: { id: true },
    });
    return NextResponse.json({ id: updated.id });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal Error" }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireUser(userId);
    const id = getIdFromUrl(req);

    const exists = await prisma.note.findFirst({ where: { id, ownerId: userId } });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal Error" }, { status });
  }
}


