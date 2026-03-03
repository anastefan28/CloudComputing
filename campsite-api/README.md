# 🏕️ Campsite REST API

A lightweight RESTful API for campsite management — built with **vanilla Node.js** (no frameworks, no external dependencies).

## Getting Started

```bash
node server.js
# Server runs at http://localhost:3000
```

---

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campsites` | List all campsites |
| GET | `/api/campsites/:id` | Get a single campsite |
| POST | `/api/campsites` | Create a new campsite |
| PUT | `/api/campsites/:id` | Replace/update a campsite |
| DELETE | `/api/campsites/:id` | Delete a campsite |

---

## Query Parameters (GET /api/campsites)

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `location` | string | `?location=Montana` | Filter by location (partial match) |
| `type` | string | `?type=tent` | Filter by type: `tent`, `rv`, `cabin`, `glamping` |
| `capacity` | number | `?capacity=4` | Minimum capacity |
| `maxPrice` | number | `?maxPrice=40` | Maximum price per night |
| `sort` | string | `?sort=price-low` | Sort: `newest`, `price-low`, `price-high`, `capacity` |

---

## Campsite Object

```json
{
  "id": "1",
  "name": "Pine Ridge Camp",
  "description": "A serene campsite nestled among tall pine trees.",
  "location": "Montana",
  "capacity": 6,
  "price": 35.00,
  "type": "tent",
  "amenities": ["firepit", "restrooms", "water"],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Required fields for POST/PUT:** `name`, `location`, `type`

---

## Examples (curl)

### List all campsites
```bash
curl http://localhost:3000/api/campsites
```

### Filter & sort
```bash
curl "http://localhost:3000/api/campsites?location=Montana&sort=price-low"
curl "http://localhost:3000/api/campsites?type=tent&maxPrice=40&capacity=4"
```

### Get one campsite
```bash
curl http://localhost:3000/api/campsites/1
```

### Create a campsite
```bash
curl -X POST http://localhost:3000/api/campsites \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Forest Escape",
    "description": "A quiet forest retreat.",
    "location": "Oregon",
    "capacity": 5,
    "price": 45,
    "type": "cabin",
    "amenities": ["firepit", "electricity", "water"]
  }'
```

### Update a campsite
```bash
curl -X PUT http://localhost:3000/api/campsites/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pine Ridge Camp (Updated)",
    "location": "Montana",
    "capacity": 8,
    "price": 40,
    "type": "tent"
  }'
```

### Delete a campsite
```bash
curl -X DELETE http://localhost:3000/api/campsites/1
```

---

## Project Structure

```
campsite-api/
├── server.js                  # Entry point, HTTP server
├── package.json
├── data/
│   └── campsites.json         # Persistent data store
├── routes/
│   └── campsiteRoute.js       # Request routing
├── controllers/
│   └── campsiteController.js  # Request handling & validation
├── models/
│   └── campsiteModel.js       # Data access layer (read/write JSON)
└── utils/
    └── helpers.js             # sendJson, parseBody
```

---

## Design Notes

- **No frameworks** — uses only Node.js built-in `http`, `fs`, `url` modules
- **JSON file storage** — data persists in `data/campsites.json` between restarts
- **Layered architecture** — routes → controllers → models (mirrors MVC)
- **Input validation** — type checks and required field checks on POST/PUT
- **Proper HTTP status codes** — 200, 201, 400, 404, 405, 500
