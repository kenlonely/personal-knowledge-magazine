import { Request, Response } from 'express'
import { createTag, deleteTag, getTagById, listTags, updateTag } from './tags.service'

export async function getTags(req: Request, res: Response) {
  const tags = await listTags(req.auth!.userId)
  res.json({ tags })
}

export async function getTag(req: Request, res: Response) {
  const tag = await getTagById(req.auth!.userId, req.params.id)
  res.json({ tag })
}

export async function createTagHandler(req: Request, res: Response) {
  const tag = await createTag(req.auth!.userId, req.body)
  res.status(201).json({
    message: 'Tag created',
    tag
  })
}

export async function updateTagHandler(req: Request, res: Response) {
  const tag = await updateTag(req.auth!.userId, req.params.id, req.body)
  res.json({
    message: 'Tag updated',
    tag
  })
}

export async function deleteTagHandler(req: Request, res: Response) {
  await deleteTag(req.auth!.userId, req.params.id)
  res.json({
    message: 'Tag deleted'
  })
}