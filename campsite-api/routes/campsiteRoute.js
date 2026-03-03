import { parse } from 'url';
import { readBody,sendJson } from '../utils.js';
import {
  handleGetCampsites, handleGetCampsite,
  handleCreateCampsite, handleUpdateCampsite, handleDeleteCampsite,
} from '../controllers/campsiteController.js';
import { handleGetReviews, handleCreateReview, handleDeleteReview } from '../controllers/reviewController.js';

export async function campsiteRoute(req, res) {
  const { pathname } = parse(req.url, true);
  const { method } = req;
  const parts = pathname.split('/').filter(Boolean);
  const id = parts[2];
  const sub = parts[3]; 
  const subId = parts[4];

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    req.body = await readBody(req);
  }

  if (method === 'GET' && !id) return handleGetCampsites(req, res);
  if (method === 'GET' && id && !sub) return handleGetCampsite(req, res, id);
  if (method === 'POST' && !id) return handleCreateCampsite(req, res);
  if (method === 'PUT' && id && !sub) return handleUpdateCampsite(req, res, id);
  if (method === 'DELETE' && id && !sub) return handleDeleteCampsite(req, res, id);
  if (method === 'GET' && id && sub === 'reviews' && !subId) return handleGetReviews(req, res, id);
  if (method === 'POST' && id && sub === 'reviews' && !subId) return handleCreateReview(req, res, id);
  if (method === 'DELETE' && id && sub === 'reviews' && subId) return handleDeleteReview(req, res, subId);

  sendJson(res, 405, { error: 'Method Not Allowed' });
}
