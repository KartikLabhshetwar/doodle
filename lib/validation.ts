import { z } from "zod";

// Block model for Notion-like canvas
export const Block = z.union([
  z.object({ type: z.literal("heading"), level: z.number().int().min(1).max(6), text: z.string() }),
  z.object({ type: z.literal("todo"), checked: z.boolean(), text: z.string() }),
  z.object({ type: z.literal("bullet"), text: z.string() }),
  z.object({ type: z.literal("numbered"), index: z.number().int().min(1), text: z.string() }),
  z.object({ type: z.literal("quote"), text: z.string() }),
  z.object({ type: z.literal("embed"), text: z.string() }),
  z.object({ type: z.literal("divider") }),
  z.object({ type: z.literal("paragraph"), text: z.string() }),
]);

export const MarkdownDoc = z.object({
  type: z.literal("markdown"),
  content: z.string().default(""),
  // Optional derived blocks representation
  blocks: z.array(Block).optional(),
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
export type BlockType = z.infer<typeof Block>;

