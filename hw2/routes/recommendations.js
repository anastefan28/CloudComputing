import { Router } from 'express';
import { getRecommendations } from '../services/aiService.js';

export const aiRouter = Router();

aiRouter.post('/', async (req, res, next) => {
  try {
    const { guests, type, location, budget, vibe } = req.body;
    const result = await getRecommendations({ guests, type, location, budget, vibe });
    res.json({ recommendations: result });
  } catch (err) {
    next(err);
  }
});
