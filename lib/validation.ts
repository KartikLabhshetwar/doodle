import { z } from "zod";

// Markdown-based content schema replacing TipTap
export const MarkdownDoc = z.object({
  type: z.literal("markdown"),
  content: z.string().default(""),
});

export const IdParamSchema = z.object({ id: z.string().min(1) });

export const NoteCreateSchema = z.object({
  title: z.string().optional(),
  contentJson: MarkdownDoc,
});

export const NoteUpdateSchema = z.object({
  title: z.string().optional(),
  contentJson: MarkdownDoc.optional(),
});

export const TodoCreateSchema = z.object({
  noteId: z.string().min(1),
  text: z.string().min(1),
});

export const TodoUpdateSchema = z.object({
  text: z.string().min(1).optional(),
  completed: z.boolean().optional(),
});

export type MarkdownDocType = z.infer<typeof MarkdownDoc>;

