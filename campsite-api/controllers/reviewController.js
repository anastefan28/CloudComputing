import { sendJson, readRecords, writeRecords } from '../utils.js';
import { randomUUID } from 'crypto';

const FILE = 'reviews.json';

export function handleGetReviews(req, res, campsiteId) {
  const reviews = readRecords(FILE).filter(r => r.campsite_id === campsiteId);
  sendJson(res, 200, reviews);
}

export function handleCreateReview(req, res, campsiteId) {
  const { user_name, rating, body } = req.body;
  const errors = [];
  if (!user_name) errors.push('user_name is required');
  if (!rating || isNaN(rating) || rating < 1 || rating > 5)
    errors.push('rating must be an integer between 1 and 5');
  if (errors.length) return sendJson(res, 400, { error: errors.join(', ') });

  const campsites = readRecords('campsites.json');
  if (!campsites.find(c => c.id === campsiteId))
    return sendJson(res, 404, { error: 'Campsite not found' });

  const reviews = readRecords(FILE);
  const review = {
    id: randomUUID(), campsite_id: campsiteId,
    user_name, rating: parseInt(rating),
    body: body || '',
    created_at: new Date().toISOString(),
  };
  reviews.push(review);
  writeRecords(FILE, reviews);
  sendJson(res, 201, review);
}

export function handleDeleteReview(req, res, reviewId) {
  const reviews = readRecords(FILE);
  const idx = reviews.findIndex(r => r.id === reviewId);
  if (idx === -1) return sendJson(res, 404, { error: 'Review not found' });
  reviews.splice(idx, 1);
  writeRecords(FILE, reviews);
  sendJson(res, 200, { message: 'Review deleted successfully' });
}
