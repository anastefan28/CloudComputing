import fetch from 'node-fetch';
import { config } from '../config/index.js';
import { getCampsites, getCampsiteReviews } from './campsiteService.js';

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const MAX_CAMPSITES = 50;
const SEND_TO_AI = 20;

export async function getRecommendations({ guests, type, location, budget, vibe }) {
  const allCampsites = await getCampsites();

  let filtered = allCampsites;

  if (type)
    filtered = filtered.filter(c => c.type === type);

  if (guests)
    filtered = filtered.filter(c => c.capacity == null || c.capacity >= parseInt(guests));

  if (budget)
    filtered = filtered.filter(c => c.price == null || c.price <= parseFloat(budget));

  if (location) {
    const loc = location.toLowerCase();
    filtered = filtered.filter(c =>
      c.county?.toLowerCase().includes(loc) ||
      c.name?.toLowerCase().includes(loc) ||
      c.description?.toLowerCase().includes(loc)
    );
  }

  if (filtered.length === 0) filtered = allCampsites;

  const top = filtered.slice(0, MAX_CAMPSITES);

  const withReviewCounts = await Promise.all(
    top.map(async c => {
      try {
        const reviews = await getCampsiteReviews(c.id);
        return { ...c, reviewCount: reviews.length };
      } catch {
        return { ...c, reviewCount: 0 };
      }
    })
  );

  withReviewCounts.sort((a, b) => b.reviewCount - a.reviewCount);

  const catalogue = withReviewCounts.slice(0, SEND_TO_AI).map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    county: c.county,
    capacity: c.capacity,
    price: c.price,
    description: c.description,
    reviews: c.reviewCount,
  }));

  const prompt = `
IMPORTANT: You must respond in English only. Do not use any other language.

You are an expert Romanian camping advisor with deep knowledge of the local outdoors.

Below is a filtered list of campsites that best match the user's preferences, sorted by popularity (number of reviews).
You must ONLY recommend campsites from this list — do not invent or suggest anything not in it.

AVAILABLE CAMPSITES (JSON):
${JSON.stringify(catalogue, null, 2)}

A user is looking for a campsite with these preferences:
- Number of guests: ${guests || 'not specified'}
- Preferred type: ${type || 'no preference'}
- Preferred region / county: ${location || 'anywhere in Romania'}
- Max budget per night (RON): ${budget || 'flexible'}
- Trip vibe / purpose: ${vibe || 'not specified'}

Your task:
1. Analyse the campsites against the user's preferences (capacity, price, type, county, popularity).
2. Pick the TOP 3 best matches. For each campsite write a proper paragraph (4-5 sentences)
   explaining WHY it fits — mention capacity, price, location, popularity and how it suits the vibe.
3. If fewer than 3 campsites match reasonably, say so honestly and suggest the closest alternatives.
4. End with a detailed packing list (at least 8 items) tailored to the campsite type and vibe.
5. Be thorough and detailed. Do not cut the response short.

Format your response using ONLY these HTML tags: <p>, <ul>, <li>, <strong>, <h4>.
No markdown, no code blocks, no extra tags.
  `.trim();

  const res = await fetch(`${API_URL}?key=${config.geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 4000 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data.candidates[0].content.parts[0].text;
  console.log(`Gemini response (${catalogue.length} campsites sent, sorted by reviews):`, text);
  return text;
}