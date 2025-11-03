import { NextResponse } from "next/server";
import { z } from "zod";
import { streamText, convertToModelMessages, tool } from "ai";
import { groq, createGroq } from "@ai-sdk/groq";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getUserIdFromRequest, requireUser } from "@/lib/auth";
import { MarkdownDocType } from "@/lib/validation";

function appendParagraph(doc: MarkdownDocType, text: string): MarkdownDocType {
  const existing = typeof doc.content === "string" ? doc.content : "";
  const next = existing ? `${existing}\n\n${text}` : text;
  return { type: "markdown", content: next } as MarkdownDocType;
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  requireUser(userId);
  const { messages, noteId, noteContent } = await req.json();
  const headerApiKey = req.headers.get("x-groq-api-key") || undefined;
  const provider = headerApiKey ? createGroq({ apiKey: headerApiKey }) : groq;

  // Extract noteId and noteContent from first user message if not in body
  let extractedNoteId = noteId;
  let extractedNoteContent = noteContent;
  
  if (!extractedNoteId && messages && messages.length > 0) {
    const firstUserMessage = messages.find((m: any) => m.role === "user");
    if (firstUserMessage) {
      const text = Array.isArray(firstUserMessage.parts)
        ? firstUserMessage.parts
            .filter((p: any) => p?.type === "text")
            .map((p: any) => p.text)
            .join(" ")
        : firstUserMessage.content || "";
      
      // Extract noteId from message format: [NoteId: ...]
      const noteIdMatch = text.match(/\[NoteId:\s*([^\]]+)\]/);
      if (noteIdMatch) {
        extractedNoteId = noteIdMatch[1].trim();
      }
      
      // Extract noteContent from message format: [NoteContent: ...] (can span multiple lines)
      const noteContentMatch = text.match(/\[NoteContent:\s*([\s\S]*?)\]\s*\n\s*\n\s*User:/);
      if (noteContentMatch) {
        extractedNoteContent = noteContentMatch[1].trim();
      }
    }
  }

  // Build system message with note context if available
  let systemMessage = "You are a helpful notes assistant. Prefer using tools for CRUD on notes and todos. Keep responses concise.";
  if (extractedNoteId && extractedNoteContent) {
    systemMessage += `\n\nYou are currently working on note ID: ${extractedNoteId}. When the user asks to modify the note, add content, create todos, edit content, etc., ALWAYS use the noteId "${extractedNoteId}" in your tool calls.
    
Current note content:
${extractedNoteContent}

Available tools for this note:
**CREATE:**
- append_text: Add content to the end of the note
- insert_text: Insert content at a specific position (start/end/line number)
- add_todo_to_note: Add a single todo item to note content
- add_multiple_todos: Add multiple todos at once to note content

**READ:**
- get_note: Get note details and full content

**UPDATE:**
- replace_text: Replace specific text (use empty newText to delete)
- update_note_content: Replace entire note content
- update_note_title: Change note title

**DELETE:**
- delete_text_from_note: Remove specific text from note

IMPORTANT: 
- When user asks to "add a todo", "create todos", "make a todo list", use add_todo_to_note or add_multiple_todos (NOT add_todo which creates DB entries)
- When user asks to "edit", "change", "update" content, use replace_text or update_note_content
- When user asks to "remove", "delete", "clear" content, use delete_text_from_note or replace_text with empty newText`;
  }

  const result = streamText({
    model: provider(process.env.GROQ_MODEL_TEXT || "openai/gpt-oss-20b"),
    system: systemMessage,
    messages: convertToModelMessages(messages || []),
    tools: {
      list_notes: tool({
        description: "List notes for the current user. Optionally filter by search query and limit results.",
        inputSchema: z.object({
          q: z.string().optional(),
          limit: z.number().int().positive().optional(),
        }),
        execute: async ({ q, limit }) => {
          const take = Math.min(limit ?? 25, 100);
          const notes = await prisma.note.findMany({
            where: {
              ownerId: userId!,
              ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
            },
            orderBy: { updatedAt: "desc" },
            take,
            select: { id: true, title: true, updatedAt: true },
          });
          return notes;
        },
      }),
      create_note: tool({
        description: "Create a new note with optional title",
        inputSchema: z.object({ title: z.string().optional() }),
        execute: async ({ title }) => {
          const created = await prisma.note.create({
            data: { ownerId: userId!, title: title ?? "Untitled", contentJson: { type: "markdown", content: "" } },
            select: { id: true },
          });
          revalidatePath("/home");
          return { id: created.id };
        },
      }),
      append_text: tool({
        description: "Append a paragraph of text to the end of a note",
        inputSchema: z.object({ noteId: z.string(), text: z.string().min(1) }),
        execute: async ({ noteId, text }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          const updatedDoc = appendParagraph(note.contentJson as any, text);
          await prisma.note.update({ where: { id: noteId }, data: { contentJson: updatedDoc } });
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      insert_text: tool({
        description: "Insert text at a specific position in a note. Use 'start' to insert at beginning, 'end' to append, or provide line number (1-indexed).",
        inputSchema: z.object({ 
          noteId: z.string(), 
          text: z.string().min(1),
          position: z.union([z.literal("start"), z.literal("end"), z.number().int().positive()]).default("end")
        }),
        execute: async ({ noteId, text, position }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          const currentContent = typeof note.contentJson === "object" && note.contentJson
            ? (note.contentJson as any).content || ""
            : (note.contentJson as string) || "";
          
          const lines = currentContent.split("\n");
          let newContent = "";
          
          if (position === "start") {
            newContent = `${text}\n\n${currentContent}`;
          } else if (position === "end") {
            newContent = currentContent ? `${currentContent}\n\n${text}` : text;
          } else {
            // Insert at specific line (1-indexed)
            const insertIndex = Math.min(position - 1, lines.length);
            lines.splice(insertIndex, 0, text);
            newContent = lines.join("\n");
          }
          
          const updatedDoc: MarkdownDocType = { type: "markdown", content: newContent };
          await prisma.note.update({ where: { id: noteId }, data: { contentJson: updatedDoc } });
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      replace_text: tool({
        description: "Replace specific text in a note with new text. If newText is empty, it removes the oldText.",
        inputSchema: z.object({ 
          noteId: z.string(), 
          oldText: z.string().min(1),
          newText: z.string().optional().default("")
        }),
        execute: async ({ noteId, oldText, newText = "" }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          const currentContent = typeof note.contentJson === "object" && note.contentJson
            ? (note.contentJson as any).content || ""
            : (note.contentJson as string) || "";
          
          if (!currentContent.includes(oldText)) {
            throw new Error("Text to replace not found in note");
          }
          
          const newContent = currentContent.replace(oldText, newText);
          const updatedDoc: MarkdownDocType = { type: "markdown", content: newContent };
          await prisma.note.update({ where: { id: noteId }, data: { contentJson: updatedDoc } });
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      update_note_content: tool({
        description: "Update the entire content of a note. This replaces all existing content with the new content.",
        inputSchema: z.object({ 
          noteId: z.string(), 
          content: z.string()
        }),
        execute: async ({ noteId, content }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          
          const updatedDoc: MarkdownDocType = { type: "markdown", content };
          await prisma.note.update({ where: { id: noteId }, data: { contentJson: updatedDoc } });
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      update_note_title: tool({
        description: "Update the title of a note",
        inputSchema: z.object({ 
          noteId: z.string(), 
          title: z.string().min(1)
        }),
        execute: async ({ noteId, title }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          
          await prisma.note.update({ where: { id: noteId }, data: { title } });
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      get_note: tool({
        description: "Get details of a specific note including its content",
        inputSchema: z.object({ 
          noteId: z.string()
        }),
        execute: async ({ noteId }) => {
          const note = await prisma.note.findFirst({ 
            where: { id: noteId, ownerId: userId! },
            select: { id: true, title: true, contentJson: true, updatedAt: true }
          });
          if (!note) throw new Error("Note not found");
          
          const content = typeof note.contentJson === "object" && note.contentJson
            ? (note.contentJson as any).content || ""
            : (note.contentJson as string) || "";
          
          return { 
            id: note.id, 
            title: note.title,
            content,
            updatedAt: note.updatedAt.toISOString()
          };
        },
      }),
      delete_text_from_note: tool({
        description: "Delete specific text or lines from a note. Provide the exact text to remove.",
        inputSchema: z.object({ 
          noteId: z.string(), 
          textToDelete: z.string().min(1)
        }),
        execute: async ({ noteId, textToDelete }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          const currentContent = typeof note.contentJson === "object" && note.contentJson
            ? (note.contentJson as any).content || ""
            : (note.contentJson as string) || "";
          
          if (!currentContent.includes(textToDelete)) {
            throw new Error("Text to delete not found in note");
          }
          
          const newContent = currentContent.replace(textToDelete, "");
          const updatedDoc: MarkdownDocType = { type: "markdown", content: newContent.trim() };
          await prisma.note.update({ where: { id: noteId }, data: { contentJson: updatedDoc } });
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      add_todo_to_note: tool({
        description: "Add a todo item directly to the note content. This inserts a markdown todo into the note, not a separate database entry.",
        inputSchema: z.object({ 
          noteId: z.string(), 
          todoText: z.string().min(1),
          position: z.union([z.literal("start"), z.literal("end")]).default("end")
        }),
        execute: async ({ noteId, todoText, position }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          const currentContent = typeof note.contentJson === "object" && note.contentJson
            ? (note.contentJson as any).content || ""
            : (note.contentJson as string) || "";
          
          const todoLine = `- [ ] ${todoText}`;
          let newContent = "";
          
          if (position === "start") {
            newContent = currentContent ? `${todoLine}\n${currentContent}` : todoLine;
          } else {
            newContent = currentContent ? `${currentContent}\n${todoLine}` : todoLine;
          }
          
          const updatedDoc: MarkdownDocType = { type: "markdown", content: newContent };
          await prisma.note.update({ where: { id: noteId }, data: { contentJson: updatedDoc } });
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      add_multiple_todos: tool({
        description: "Add multiple todo items to the note content at once. Provide an array of todo texts.",
        inputSchema: z.object({ 
          noteId: z.string(), 
          todos: z.array(z.string().min(1)).min(1),
          position: z.union([z.literal("start"), z.literal("end")]).default("end")
        }),
        execute: async ({ noteId, todos, position }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          const currentContent = typeof note.contentJson === "object" && note.contentJson
            ? (note.contentJson as any).content || ""
            : (note.contentJson as string) || "";
          
          const todoLines = todos.map(todo => `- [ ] ${todo}`).join("\n");
          let newContent = "";
          
          if (position === "start") {
            newContent = currentContent ? `${todoLines}\n${currentContent}` : todoLines;
          } else {
            newContent = currentContent ? `${currentContent}\n${todoLines}` : todoLines;
          }
          
          const updatedDoc: MarkdownDocType = { type: "markdown", content: newContent };
          await prisma.note.update({ where: { id: noteId }, data: { contentJson: updatedDoc } });
          revalidatePath("/home");
          return { ok: true, count: todos.length };
        },
      }),
      add_todo: tool({
        description: "Add a todo to a note",
        inputSchema: z.object({ noteId: z.string(), text: z.string().min(1) }),
        execute: async ({ noteId, text }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! }, select: { id: true } });
          if (!note) throw new Error("Note not found");
          const created = await prisma.todo.create({ data: { noteId, text }, select: { id: true } });
          revalidatePath("/home");
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
          revalidatePath("/home");
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
          revalidatePath("/home");
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
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      delete_note: tool({
        description: "Delete a note by id or title",
        inputSchema: z
          .object({ noteId: z.string().optional(), title: z.string().optional() })
          .refine((d) => !!d.noteId || !!d.title, {
            message: "Provide noteId or title",
          }),
        execute: async ({ noteId, title }) => {
          let id = noteId;
          if (!id && title) {
            const found = await prisma.note.findFirst({
              where: { ownerId: userId!, title },
              select: { id: true },
            });
            if (!found) throw new Error("Note not found");
            id = found.id;
          }
          await prisma.note.delete({ where: { id: id! } });
          revalidatePath("/home");
          return { ok: true };
        },
      }),
      list_todos: tool({
        description: "List todos for a note",
        inputSchema: z.object({ 
          noteId: z.string()
        }),
        execute: async ({ noteId }) => {
          const note = await prisma.note.findFirst({ where: { id: noteId, ownerId: userId! } });
          if (!note) throw new Error("Note not found");
          
          const todos = await prisma.todo.findMany({
            where: { noteId },
            select: { id: true, text: true, completed: true },
            orderBy: { createdAt: "asc" },
          });
          return todos;
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}


