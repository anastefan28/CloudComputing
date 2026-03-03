import http from 'http';
import { parse } from 'url';
import { routes } from './router.js';
import { sendJson } from './utils.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const { pathname } = parse(req.url, true);
  try {
    const matchedKey = Object.keys(routes).find(route => pathname.startsWith(route));
    if (matchedKey) return await routes[matchedKey](req, res);
    sendJson(res, 404, { error: 'Route not found' });
  } catch (err) {
    console.error(err);
    sendJson(res, err.status || 500, { error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
