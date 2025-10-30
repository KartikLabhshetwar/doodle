import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NoteCreateSchema } from "@/lib/validation";
import { getUserIdFromRequest, requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireUser(userId);

    const notes = await prisma.note.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json({ notes });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal Error" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireUser(userId);

    const body = await req.json();
    const parsed = NoteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, contentJson } = parsed.data;
    const created = await prisma.note.create({
      data: {
        title: title ?? "Untitled",
        contentJson,
        ownerId: userId,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal Error" }, { status });
  }
}


