import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { IdParamSchema, TodoUpdateSchema } from "@/lib/validation";
import { getUserIdFromRequest, requireUser } from "@/lib/auth";

function getTodoId(req: Request) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop() || "";
  const parsed = IdParamSchema.safeParse({ id });
  if (!parsed.success) {
    const err = new Error("Invalid id");
    // @ts-expect-error status used by caller
    (err as any).status = 400;
    throw err;
  }
  return parsed.data.id;
}

export async function PUT(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireUser(userId);
    const id = getTodoId(req);
    const body = await req.json();
    const parsed = TodoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const todo = await prisma.todo.findUnique({ where: { id }, select: { note: { select: { ownerId: true } } } });
    if (!todo || todo.note.ownerId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.todo.update({
      where: { id },
      data: { ...parsed.data },
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
    const id = getTodoId(req);

    const todo = await prisma.todo.findUnique({ where: { id }, select: { note: { select: { ownerId: true } } } });
    if (!todo || todo.note.ownerId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.todo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal Error" }, { status });
  }
}


