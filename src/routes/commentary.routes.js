import { Router } from 'express';

import { getCommentary, createCommentary } from '../controllers/commentary.controller.js';

export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get('/', getCommentary);
commentaryRouter.post('/', createCommentary);