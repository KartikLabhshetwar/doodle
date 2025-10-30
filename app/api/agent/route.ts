import { NextResponse } from "next/server";
import { z } from "zod";
import { streamText, convertToModelMessages, tool } from "ai";
import { groq } from "@ai-sdk/groq";
import { prisma } from "@/lib/db";
import { getUserIdFromRequest, requireUser } from "@/lib/auth";
import { TipTapDocType } from "@/lib/validation";

function appendParagraph(doc: TipTapDocType, text: string): TipTapDocType {
  const newNode = { type: "paragraph", content: [{ type: "text", text }] } as any;
  const content = Array.isArray(doc.content) ? [...doc.content, newNode] : [newNode];
  return { type: "doc", content } as TipTapDocType;
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  requireUser(userId);
  const { messages } = await req.json();

  const result = streamText({
    model: groq(process.env.GROQ_MODEL_TEXT || "openai/gpt-oss-20b"),
    system:
      "You are a helpful notes assistant. Prefer using tools for CRUD on notes and todos. Keep responses concise.",
    messages: convertToModelMessages(messages || []),
    tools: {
      create_note: tool({
        description: "Create a new note with optional title",
        inputSchema: z.object({ title: z.string().optional() }),
        execute: async ({ title }) => {
          const created = await prisma.note.create({
            data: { ownerId: userId!, title: title ?? "Untitled", contentJson: { type: "doc", content: [] } },
            select: { id: true },
          });
          return { id: created.id };
        },
      }),
      append_text: tool({
        description: "Append a paragraph of text to a note",
        inputSchema: z.object({ noteId: z.string(), text: z.string().min(1) }),
        execute: async ({ noteId, text }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          const updatedDoc = appendParagraph(note.contentJson as any, text);
          await prisma.note.update({ where: { id: noteId }, data: { contentJson: updatedDoc } });
          return { ok: true };
        },
      }),
      add_todo: tool({
        description: "Add a todo to a note",
        inputSchema: z.object({ noteId: z.string(), text: z.string().min(1) }),
        execute: async ({ noteId, text }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! }, select: { id: true } });
          if (!note) throw new Error("Note not found");
          const created = await prisma.todo.create({ data: { noteId, text }, select: { id: true } });
          return { id: created.id };
        },
      }),
      update_todo: tool({
        description: "Update a todo text",
        inputSchema: z.object({ todoId: z.string(), text: z.string().min(1) }),
        execute: async ({ todoId, text }) => {
          const todo = await prisma.todo.findUnique({ where: { id: todoId }, select: { note: { select: { ownerId: true } } } });
          if (!todo || todo.note.ownerId !== userId) throw new Error("Todo not found");
          await prisma.todo.update({ where: { id: todoId }, data: { text } });
          return { ok: true };
        },
      }),
      set_todo_completed: tool({
        description: "Set a todo completed state",
        inputSchema: z.object({ todoId: z.string(), completed: z.boolean() }),
        execute: async ({ todoId, completed }) => {
          const todo = await prisma.todo.findUnique({ where: { id: todoId }, select: { note: { select: { ownerId: true } } } });
          if (!todo || todo.note.ownerId !== userId) throw new Error("Todo not found");
          await prisma.todo.update({ where: { id: todoId }, data: { completed } });
          return { ok: true };
        },
      }),
      delete_todo: tool({
        description: "Delete a todo",
        inputSchema: z.object({ todoId: z.string() }),
        execute: async ({ todoId }) => {
          const todo = await prisma.todo.findUnique({ where: { id: todoId }, select: { note: { select: { ownerId: true } } } });
          if (!todo || todo.note.ownerId !== userId) throw new Error("Todo not found");
          await prisma.todo.delete({ where: { id: todoId } });
          return { ok: true };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}


