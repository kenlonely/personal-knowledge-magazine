import { z } from 'zod'

export const createTagSchema = z.object({
  name: z.string().min(1).max(500),
  parsedType: z.enum(['text', 'image', 'iframe', 'video']),
  parsedSrc: z.string().url().optional().nullable(),
  parsedAlt: z.string().max(500).optional().nullable(),
  parsedDisplayTitle: z.string().max(10000).optional().nullable(),
  hidden: z.boolean().optional().default(false),
  struck: z.boolean().optional().default(false)
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  parsedType: z.enum(['text', 'image', 'iframe', 'video']).optional(),
  parsedSrc: z.string().url().optional().nullable(),
  parsedAlt: z.string().max(500).optional().nullable(),
  parsedDisplayTitle: z.string().max(10000).optional().nullable(),
  hidden: z.boolean().optional(),
  struck: z.boolean().optional()
})