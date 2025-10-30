import { z } from "zod";

// Simplified TipTap JSON schema: allow known nodes and unknown props while ensuring array/object shapes
export const TipTapNode = z.object({
  type: z.string(),
  attrs: z.record(z.any()).optional(),
  text: z.string().optional(),
  marks: z
    .array(
      z.object({
        type: z.string(),
        attrs: z.record(z.any()).optional(),
      })
    )
    .optional(),
  content: z.lazy(() => z.array(TipTapNode)).optional(),
});

export const TipTapDoc = z.object({
  type: z.literal("doc"),
  content: z.array(TipTapNode).default([]),
});

export const IdParamSchema = z.object({ id: z.string().min(1) });

export const NoteCreateSchema = z.object({
  title: z.string().optional(),
  contentJson: TipTapDoc,
});

export const NoteUpdateSchema = z.object({
  title: z.string().optional(),
  contentJson: TipTapDoc.optional(),
});

export const TodoCreateSchema = z.object({
  noteId: z.string().min(1),
  text: z.string().min(1),
});

export const TodoUpdateSchema = z.object({
  text: z.string().min(1).optional(),
  completed: z.boolean().optional(),
});

export type TipTapDocType = z.infer<typeof TipTapDoc>;

