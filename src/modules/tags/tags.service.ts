import { prisma } from '../../prisma/client'
import { AppError } from '../../utils/appError'

export async function listTags(userId: string) {
  return prisma.tag.findMany({
    where: {
      userId,
      deletedAt: null
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })
}

export async function createTag(
  userId: string,
  input: {
    name: string
    parsedType: 'text' | 'image' | 'iframe' | 'video'
    parsedSrc?: string | null
    parsedAlt?: string | null
    parsedDisplayTitle?: string | null
    hidden?: boolean
    struck?: boolean
  }
) {
  return prisma.tag.create({
    data: {
      userId,
      name: input.name,
      parsedType: input.parsedType,
      parsedSrc: input.parsedSrc ?? null,
      parsedAlt: input.parsedAlt ?? null,
      parsedDisplayTitle: input.parsedDisplayTitle ?? null,
      hidden: input.hidden ?? false,
      struck: input.struck ?? false
    }
  })
}

export async function getTagById(userId: string, id: string) {
  const tag = await prisma.tag.findFirst({
    where: {
      id,
      userId,
      deletedAt: null
    }
  })

  if (!tag) {
    throw new AppError('Tag not found', 404)
  }

  return tag
}

export async function updateTag(
  userId: string,
  id: string,
  input: {
    name?: string
    parsedType?: 'text' | 'image' | 'iframe' | 'video'
    parsedSrc?: string | null
    parsedAlt?: string | null
    parsedDisplayTitle?: string | null
    hidden?: boolean
    struck?: boolean
  }
) {
  await getTagById(userId, id)

  return prisma.tag.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.parsedType !== undefined ? { parsedType: input.parsedType } : {}),
      ...(input.parsedSrc !== undefined ? { parsedSrc: input.parsedSrc } : {}),
      ...(input.parsedAlt !== undefined ? { parsedAlt: input.parsedAlt } : {}),
      ...(input.parsedDisplayTitle !== undefined
        ? { parsedDisplayTitle: input.parsedDisplayTitle }
        : {}),
      ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
      ...(input.struck !== undefined ? { struck: input.struck } : {})
    }
  })
}

export async function deleteTag(userId: string, id: string) {
  await getTagById(userId, id)

  await prisma.tag.update({
    where: { id },
    data: {
      deletedAt: new Date()
    }
  })

  return { success: true }
}