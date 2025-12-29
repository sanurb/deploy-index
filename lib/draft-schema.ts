import { z } from "zod"

export const DRAFT_STORAGE_VERSION = 1

export const draftSchema = z.object({
  key: z.string(),
  content: z.string(),
  updatedAt: z.number(),
  schemaVersion: z.literal(DRAFT_STORAGE_VERSION),
})

export type Draft = z.infer<typeof draftSchema>

export function createDraft(key: string, content: string): Draft {
  return {
    key,
    content,
    updatedAt: Date.now(),
    schemaVersion: DRAFT_STORAGE_VERSION,
  }
}

export function validateDraft(data: unknown): Draft {
  return draftSchema.parse(data)
}

export function safeValidateDraft(
  data: unknown,
): { success: true; data: Draft } | { success: false; error: z.ZodError } {
  const result = draftSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}
