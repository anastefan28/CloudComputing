import { readRecords, writeRecords, sendJson } from '../utils.js';
import { randomUUID } from 'crypto';

const FILE = 'bookings.json';

export function handleGetBookings(req, res) {
  sendJson(res, 200, readRecords(FILE));
}

export function handleGetBooking(req, res, id) {
  const booking = readRecords(FILE).find(b => b.id === id);
  if (!booking) return sendJson(res, 404, { error: 'Booking not found' });
  sendJson(res, 200, booking);
}

export function handleCreateBooking(req, res) {
  const { campsite_id, user_name, checkin, checkout, guests } = req.body;
  const errors = [];
  if (!campsite_id) errors.push('campsite_id is required');
  if (!user_name)   errors.push('user_name is required');
  if (!checkin || !checkout) errors.push('checkin and checkout are required');
  if (checkin && checkout && checkin >= checkout)
    errors.push('checkout must be after checkin');
  if (guests && (isNaN(guests) || guests < 1))
    errors.push('guests must be a positive integer');
  if (errors.length) return sendJson(res, 400, { error: errors.join(', ') });

  const campsites = readRecords('campsites.json');
  if (!campsites.find(c => c.id === campsite_id))
    return sendJson(res, 404, { error: 'Campsite not found' });

  const bookings = readRecords(FILE);
  const overlap = bookings.some(b =>
    b.campsite_id === campsite_id &&
    b.status === 'confirmed' &&
    checkin < b.checkout &&
    checkout > b.checkin
  );
  if (overlap) return sendJson(res, 409, { error: 'Campsite already booked for those dates' });

  const booking = {
    id: randomUUID(), campsite_id, user_name,
    checkin, checkout,
    guests: guests ? parseInt(guests) : 1,
    status: 'confirmed',
    created_at: new Date().toISOString(),
  };
  bookings.push(booking);
  writeRecords(FILE, bookings);
  sendJson(res, 201, booking);
}

export function handleUpdateBooking(req, res, id) {
  const bookings = readRecords(FILE);
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return sendJson(res, 404, { error: 'Booking not found' });
  const { status, guests } = req.body;
  const validStatuses = ['confirmed', 'cancelled', 'pending'];
  if (status && !validStatuses.includes(status))
    return sendJson(res, 400, { error: `status must be one of: ${validStatuses.join(', ')}` });
  bookings[idx] = {
    ...bookings[idx],
    status: status ?? bookings[idx].status,
    guests: guests != null ? parseInt(guests) : bookings[idx].guests,
  };
  writeRecords(FILE, bookings);
  sendJson(res, 200, bookings[idx]);
}

export function handleDeleteBooking(req, res, id) {
  const bookings = readRecords(FILE);
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return sendJson(res, 404, { error: 'Booking not found' });
  bookings.splice(idx, 1);
  writeRecords(FILE, bookings);
  sendJson(res, 200, { message: 'Booking deleted successfully' });
}
