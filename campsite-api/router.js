import { campsiteRoute } from './routes/campsiteRoute.js';
import { bookingRoute }  from './routes/bookingRoute.js';

export const routes = {
  '/api/campsites': campsiteRoute,
  '/api/bookings':  bookingRoute,
};
