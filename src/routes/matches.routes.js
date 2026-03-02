import { Router } from 'express';

import { getMatches, createMatches } from '../controllers/matches.controller.js';

export const matchRouter = Router();

matchRouter.get('/', getMatches);
matchRouter.post('/', createMatches);