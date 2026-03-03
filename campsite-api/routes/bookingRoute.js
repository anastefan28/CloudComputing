import { parse } from 'url';
import { readBody, sendJson } from '../utils.js';
import {
  handleGetBookings, handleGetBooking,
  handleCreateBooking, handleUpdateBooking, handleDeleteBooking,
} from '../controllers/bookingController.js';

export async function bookingRoute(req, res) {
  const { pathname } = parse(req.url, true);
  const { method } = req;
  const parts = pathname.split('/').filter(Boolean);
  const id = parts[2];

  if (['POST', 'PUT'].includes(method)) {
    req.body = await readBody(req);
  }

  if (method === 'GET' && !id) return handleGetBookings(req, res);
  if (method === 'GET' &&  id) return handleGetBooking(req, res, id);
  if (method === 'POST' && !id) return handleCreateBooking(req, res);
  if (method === 'PUT' &&  id) return handleUpdateBooking(req, res, id);
  if (method === 'DELETE' &&  id) return handleDeleteBooking(req, res, id);

  sendJson(res, 405, { error: 'Method Not Allowed' });
}
