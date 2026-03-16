async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  getCampsites: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    return apiFetch(`/api/campsites${qs ? '?' + qs : ''}`);
  },

  getCampsite: (id) => apiFetch(`/api/campsites/${id}`),

  getRecommendations: (body) => apiFetch('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
};
