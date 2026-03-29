
import { config } from '../config/index.js';

export async function getStaticMap(lat, lon) {
  const url = `https://maps.geoapify.com/v1/staticmap`
    + `?style=osm-carto`
    + `&width=800&height=500`
    + `&center=lonlat:${lon},${lat}`
    + `&zoom=10`
    + `&marker=lonlat:${lon},${lat};color:%232d6a4f;size:large`
    + `&apiKey=${config.geoapifyApiKey}`;
  return url; 
}