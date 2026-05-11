import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware'
import { validateBody } from '../../middleware/validate.middleware'
import { asyncHandler } from '../../utils/asyncHandler'
import {
  createTagHandler,
  deleteTagHandler,
  getTag,
  getTags,
  updateTagHandler
} from './tags.controller'
import { createTagSchema, updateTagSchema } from './tags.schema'

const router = Router()

router.use(requireAuth)

router.get('/', asyncHandler(getTags))
router.get('/:id', asyncHandler(getTag))
router.post('/', validateBody(createTagSchema), asyncHandler(createTagHandler))
router.patch('/:id', validateBody(updateTagSchema), asyncHandler(updateTagHandler))
router.delete('/:id', asyncHandler(deleteTagHandler))

export default router