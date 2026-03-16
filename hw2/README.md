# CampExplorer – Homework 2

A campsite discovery app using **Express** + plain HTML/JS that integrates 3 web services:

1. **Campsite REST API** (Homework 1) – CRUD for campsites, reviews, bookings
2. **OpenWeatherMap API** – live weather & forecast at each campsite's coordinates
3. **Anthropic Claude API** – AI-powered campsite tips & packing recommendations

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in your API keys:

| Variable              | Where to get it                              |
|-----------------------|----------------------------------------------|
| `CAMPSITE_API_URL`    | URL of your running HW1 server (e.g. `http://localhost:3000`) |
| `OPENWEATHER_API_KEY` | https://openweathermap.org/api → free tier    |
| `ANTHROPIC_API_KEY`   | https://console.anthropic.com                |

### 3. Start the HW1 campsite API
```bash
cd ../campsite-api && node server.js
```

### 4. Start this app
```bash
npm start
# or for auto-reload during development:
npm run dev
```

Open **http://localhost:4000**

---

## Project Structure

```
hw2/
├── server.js              # Express entry point
├── config/
│   └── index.js           # Reads & validates env vars (fail-fast)
├── services/
│   ├── campsiteService.js # Calls HW1 API
│   ├── weatherService.js  # Calls OpenWeatherMap
│   └── aiService.js       # Calls Anthropic Claude
├── routes/
│   ├── campsites.js       # GET /api/campsites, GET /api/campsites/:id
│   └── recommendations.js # POST /api/recommendations
└── public/
    ├── index.html         # Single HTML shell
    ├── css/style.css
    └── js/
        ├── router.js      # Client-side SPA router
        ├── api.js         # Frontend fetch helpers
        └── pages/
            ├── home.js           # Campsite listing + filters
            ├── detail.js         # Campsite detail + weather
            └── recommendations.js # AI advisor form
```

## API Endpoints (backend)

| Method | Path                      | Description                                      |
|--------|---------------------------|--------------------------------------------------|
| GET    | `/api/campsites`          | List campsites (proxies HW1, supports filters)   |
| GET    | `/api/campsites/:id`      | Campsite detail + weather + reviews              |
| POST   | `/api/recommendations`    | AI tips (body: guests, type, location, budget)   |
