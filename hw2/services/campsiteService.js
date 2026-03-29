import fetch from 'node-fetch';
import { config } from '../config/index.js';

const base = config.campsiteApiUrl;

async function request(path) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Campsite API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getCampsites(filters = {}) {
  const params = new URLSearchParams();
  if (filters.location) params.set('location', filters.location);
  if (filters.type) params.set('type', filters.type);
  if (filters.guests) params.set('guests', filters.guests);
  if (filters.sort) params.set('sort', filters.sort);
  const qs = params.toString();
  return request(`/api/campsites${qs ? '?' + qs : ''}`);
}

export async function getCampsite(id) {
  return request(`/api/campsites/${id}`);
}

export async function getCampsiteReviews(id) {
  return request(`/api/campsites/${id}/reviews`);
}
