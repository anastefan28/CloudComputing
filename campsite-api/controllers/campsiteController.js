import { readRecords, writeRecords,sendJson } from '../utils.js';
import { randomUUID } from 'crypto';

const FILE = 'campsites.json';

const VALID_TYPES = ['tent', 'rv', 'cabin', 'glamping'];
const VALID_SORTS = ['newest', 'price-low', 'price-high', 'rating'];

export function handleGetCampsites(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const location = url.searchParams.get('location')?.trim().toLowerCase();
  const guests = url.searchParams.get('guests') ? parseInt(url.searchParams.get('guests')) : null;
  const type = url.searchParams.get('type');
  const sort = url.searchParams.get('sort') || 'newest';

  const errors = [];
  if (guests !== null && (isNaN(guests) || guests < 1 || guests > 20))
    errors.push('guests must be an integer between 1 and 20');
  if (type && !VALID_TYPES.includes(type))
    errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  if (!VALID_SORTS.includes(sort))
    errors.push(`sort must be one of: ${VALID_SORTS.join(', ')}`);
  if (errors.length)
    return sendJson(res, 400, { error: errors.join(', ') });

  let campsites = readRecords(FILE);

  if (location)
    campsites = campsites.filter(c =>
      c.name.toLowerCase().includes(location) ||
      c.county.toLowerCase().includes(location)
    );
  if (guests !== null)
    campsites = campsites.filter(c => c.capacity >= guests);
  if (type)
    campsites = campsites.filter(c => c.type === type);

  if (sort === 'price-low')  campsites.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') campsites.sort((a, b) => b.price - a.price);
  if (sort === 'newest')     campsites.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  sendJson(res, 200, campsites);
}

export function handleGetCampsite(req, res, id) {
  const campsites = readRecords(FILE);
  const campsite = campsites.find(c => c.id === id);
  if (!campsite) return sendJson(res, 404, { error: 'Campsite not found' });
  sendJson(res, 200, campsite);
}

export function handleCreateCampsite(req, res) {
  const { name, description, lat, lon, capacity, price, county, type } = req.body;
  const errors = [];
  if (!name)     errors.push('name is required');
  if (lat == null || lon == null) errors.push('lat and lon are required');
  if (!type || !VALID_TYPES.includes(type)) errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  if (errors.length) return sendJson(res, 400, { error: errors.join(', ') });

  const campsites = readRecords(FILE);
  const campsite = {
    id: randomUUID(),
    name, description: description || '',
    lat: parseFloat(lat), lon: parseFloat(lon),
    capacity: capacity ? parseInt(capacity) : null,
    price: price ? parseFloat(price) : null,
    county: county || 'Iași',
    type,
    created_at: new Date().toISOString(),
  };
  campsites.push(campsite);
  writeRecords(FILE, campsites);
  sendJson(res, 201, campsite);
}

export function handleUpdateCampsite(req, res, id) {
  const campsites = readRecords(FILE);
  const idx = campsites.findIndex(c => c.id === id);
  if (idx === -1) return sendJson(res, 404, { error: 'Campsite not found' });

  const { name, description, lat, lon, capacity, price, county, type } = req.body;
  const errors = [];
  if (!name) errors.push('name is required');
  if (type && !VALID_TYPES.includes(type)) errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  if (errors.length) return sendJson(res, 400, { error: errors.join(', ') });

  campsites[idx] = {
    ...campsites[idx],
    name: name ?? campsites[idx].name,
    description: description ?? campsites[idx].description,
    lat: lat != null ? parseFloat(lat) : campsites[idx].lat,
    lon: lon != null ? parseFloat(lon) : campsites[idx].lon,
    capacity: capacity != null ? parseInt(capacity) : campsites[idx].capacity,
    price: price != null ? parseFloat(price) : campsites[idx].price,
    county: county ?? campsites[idx].county,
    type: type ?? campsites[idx].type,
  };
  writeRecords(FILE, campsites);
  sendJson(res, 200, campsites[idx]);
}

export function handleDeleteCampsite(req, res, id) {
  const campsites = readRecords(FILE);
  const idx = campsites.findIndex(c => c.id === id);
  if (idx === -1) return sendJson(res, 404, { error: 'Campsite not found' });
  campsites.splice(idx, 1);
  writeRecords(FILE, campsites);
  sendJson(res, 200, { message: 'Campsite deleted successfully' });
}
